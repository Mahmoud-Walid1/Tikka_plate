const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    const providedPassword = req.headers.authorization;
    const correctPassword = process.env.DASHBOARD_PASSWORD;
    if (!providedPassword || providedPassword !== correctPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        const serviceAccountAuth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        
        const requiredHeaders = ['رقم الفاتورة', 'تم التسليم'];
        const actualHeaders = sheet.headerValues;
        for (const header of requiredHeaders) {
            if (!actualHeaders.includes(header)) {
                throw new Error(`Column "${header}" not found in Google Sheet.`);
            }
        }

        const rows = await sheet.getRows();

        const orders = rows
            .filter(row => row.get('رقم الفاتورة'))
            .map(row => ({
                rowId: row.offset,
                InvoiceID: row.get('رقم الفاتورة') || 'N/A',
                CustomerPhone: row.get('رقم العميل') || 'N/A',
                OrderDetails: row.get('تفاصيل الطلب') || 'N/A',
                TotalAmount: row.get('الإجمالي المدفوع') || '0',
                Status: row.get('حالة الدفع') || 'N/A',
                OrderTime: row.get('وقت الطلب') || 'N/A',
                Delivered: row.get('تم التسليم') === 'نعم'
            }));
        
        const sortedOrders = orders.sort((a, b) => {
             try {
                const dateA = new Date(a.OrderTime.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3'));
                const dateB = new Date(b.OrderTime.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3'));
                return dateB - dateA;
             } catch (e) { return 0; }
        });

        res.status(200).json(sortedOrders);
    } catch (error) {
        console.error('Google Sheet Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch orders from Google Sheets.', details: error.message });
    }
};
