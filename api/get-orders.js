const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // 1. التحقق من كلمة المرور
    const providedPassword = req.headers.authorization;
    const correctPassword = process.env.DASHBOARD_PASSWORD;
    if (!providedPassword || providedPassword !== correctPassword) {
        return res.status(401).json({ error: 'Unauthorized', details: 'Invalid or missing password.' });
    }

    try {
        // 2. الاتصال بجوجل شيت
        const credsJsonString = process.env.GOOGLE_CREDENTIALS_JSON;
        if (!credsJsonString) {
             throw new Error('GOOGLE_CREDENTIALS_JSON environment variable is not set.');
        }
        
        // <<< === بداية الإضافة: هنطبع جزء من البيانات عشان نتأكد === >>>
        let creds;
        try {
            creds = JSON.parse(credsJsonString);
            console.log("Successfully parsed credentials. Client Email:", creds.client_email); // نطبع الإيميل
            if(!creds.private_key) throw new Error("Private key is missing in parsed credentials.");
            if(!creds.client_email) throw new Error("Client email is missing in parsed credentials.");

        } catch (parseError) {
             console.error("Failed to parse GOOGLE_CREDENTIALS_JSON:", parseError);
             throw new Error(`Failed to parse GOOGLE_CREDENTIALS_JSON: ${parseError.message}`);
        }
        // <<< === نهاية الإضافة === >>>

        const serviceAccountAuth = new JWT({
            email: creds.client_email,
            key: creds.private_key, // استخدم المفتاح من المتغير المقروء
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        
        await doc.loadInfo(); 
        const sheet = doc.sheetsByIndex[0]; 
        await sheet.loadHeaderRow(); 

        const rows = await sheet.getRows();

        // ... (باقي الكود لتنظيم وعرض البيانات زي ما هو) ...
        const orders = rows.filter(/*...*/).map(/*...*/);
        const sortedOrders = orders.sort(/*...*/);
        res.status(200).json(sortedOrders);

    } catch (error) {
        console.error('Google Sheet Fetch Error:', error); // هنا هيطبع الخطأ 403 لو لسه موجود
        res.status(500).json({ error: 'Failed to fetch orders from Google Sheets.', details: error.message });
    }
};

// --- Helper Functions ---
// (دوال تنظيم البيانات والترتيب زي ما هي)
const mapRowToOrder = (row) => ({ /* ... */ });
const sortOrders = (orders) => { /* ... */ };
