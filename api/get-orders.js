const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// --- Helper Function to safely get data ---
const getSafe = (row, header) => {
    try {
        const value = row.get(header);
        return value !== undefined ? value : null; // Return null if undefined
    } catch (e) {
        // Log if the header itself is missing, but don't crash
        console.warn(`Warning: Header "${header}" might be missing or inaccessible.`);
        return null;
    }
};

// --- Helper Function to parse dates safely ---
const parseOrderTime = (orderTimeString) => {
    if (!orderTimeString || typeof orderTimeString !== 'string') return null;
    try {
        // Assuming format like "DD/MM/YYYY, HH:MM:SS" (adjust if different)
        const parts = orderTimeString.split(', ');
        if (parts.length < 2) return null;
        const dateParts = parts[0].split('/');
        if (dateParts.length < 3) return null;
        // Reassemble in ISO-like format (YYYY-MM-DDTHH:MM:SS) for reliable parsing
        const isoString = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${parts[1]}`;
        const date = new Date(isoString);
        // Check if the date is valid
        return isNaN(date.getTime()) ? null : date;
    } catch (e) {
        console.warn(`Warning: Could not parse OrderTime "${orderTimeString}"`);
        return null;
    }
};

module.exports = async (req, res) => {
    // 1. Check Password
    const providedPassword = req.headers.authorization;
    const correctPassword = process.env.DASHBOARD_PASSWORD;
    if (!providedPassword || providedPassword !== correctPassword) {
        return res.status(401).json({ error: 'Unauthorized', details: 'Invalid or missing password.' });
    }

    try {
        // 2. Connect and Authenticate with Google Sheets
        const credsJsonString = process.env.GOOGLE_CREDENTIALS_JSON;
        if (!credsJsonString) throw new Error('GOOGLE_CREDENTIALS_JSON missing.');
        const creds = JSON.parse(credsJsonString);

        const serviceAccountAuth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        await sheet.loadHeaderRow(); // Ensure headers are loaded

        const rows = await sheet.getRows();

        // 3. Process rows safely
        const orders = rows
            .filter(row => getSafe(row, 'رقم الفاتورة')) // Filter out rows without InvoiceID
            .map(row => ({
                rowId: row.offset,
                InvoiceID: getSafe(row, 'رقم الفاتورة') || 'N/A',
                CustomerPhone: getSafe(row, 'رقم العميل') || 'N/A',
                OrderDetails: getSafe(row, 'تفاصيل الطلب') || 'N/A',
                TotalAmount: getSafe(row, 'الإجمالي المدفوع') || '0',
                Status: getSafe(row, 'حالة الدفع') || 'N/A',
                OrderTime: getSafe(row, 'وقت الطلب') || 'N/A', // Keep original string for display
                Delivered: getSafe(row, 'تم التسليم') === 'نعم',
                _parsedOrderTime: parseOrderTime(getSafe(row, 'وقت الطلب')) // Parsed date for sorting
            }));

        // 4. Sort orders safely
        const sortedOrders = orders.sort((a, b) => {
            // Sort by parsed date, putting invalid dates last
            const dateA = a._parsedOrderTime;
            const dateB = b._parsedOrderTime;
            if (dateA && dateB) return dateB - dateA; // Newest first
            if (dateA && !dateB) return -1; // A is valid, B is not -> A comes first
            if (!dateA && dateB) return 1;  // B is valid, A is not -> B comes first
            return 0; // Both invalid or same
        });

        // Remove the temporary parsed date before sending response
        sortedOrders.forEach(order => delete order._parsedOrderTime);

        res.status(200).json(sortedOrders);

    } catch (error) {
        console.error('Google Sheet Fetch Error:', error); // Log the detailed error on the server
        res.status(500).json({ error: 'Failed to fetch orders from Google Sheets.', details: error.message });
    }
};
