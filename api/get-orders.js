const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // ... (بداية الملف والتحقق من كلمة السر زي ما هي) ...
    const providedPassword = req.headers.authorization;
    const correctPassword = process.env.DASHBOARD_PASSWORD;
    if (!providedPassword || providedPassword !== correctPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // ... (الاتصال بجوجل شيت زي ما هو) ...
        const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        const serviceAccountAuth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();

        // <<< === بداية التعديل: هنفلتر السطور الفاضية === >>>
        const orders = rows
            .filter(row => row.get('رقم الفاتورة')) // السطر ده هيتجاهل أي صف معندوش رقم فاتورة
            .map(row => ({
                rowId: row.offset,
                InvoiceID: row.get('رقم الفاتورة'),
                CustomerPhone: row.get('رقم العميل'),
                OrderDetails: row.get('تفاصيل الطلب'),
                TotalAmount: row.get('الإجمالي المدفوع'),
                Status: row.get('حالة الدفع'),
                OrderTime: row.get('وقت الطلب'),
                Delivered: row.get('تم التسليم') === 'نعم'
            }));
        // <<< === نهاية التعديل === >>>
        
        // ... (باقي الكود وترتيب الطلبات زي ما هو) ...
        const sortedOrders = orders.sort((a, b) => { /* ... */ });
        res.status(200).json(sortedOrders);
    } catch (error) {
        // ... (نهاية الملف زي ما هي) ...
    }
};
