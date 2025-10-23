const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // ... (التحقق من كلمة السر)
    const providedPassword = req.headers.authorization;
    const correctPassword = process.env.DASHBOARD_PASSWORD;
     if (!providedPassword || providedPassword !== correctPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        // ... (الاتصال بجوجل شيت)
         const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
         const serviceAccountAuth = new JWT({ /* ... */ });
         const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
         
         await doc.loadInfo(); 
         const sheet = doc.sheetsByIndex[0]; 
         await sheet.loadHeaderRow(); // التأكد من تحميل الأعمدة

        const rows = await sheet.getRows();

        const orders = rows
            .filter(row => row.get('رقم الفاتورة')) // نتجاهل السطور الفاضية
            .map(row => ({
                rowId: row.offset,
                InvoiceID: row.get('رقم الفاتورة') || 'N/A',
                CustomerPhone: row.get('رقم العميل') || 'N/A',
                OrderDetails: row.get('تفاصيل الطلب') || 'N/A',
                TotalAmount: row.get('الإجمالي المدفوع') || '0',
                Status: row.get('حالة الدفع') || 'N/A',
                OrderTime: row.get('وقت الطلب') || 'N/A',
                Delivered: row.get('تم التسليم') === 'نعم' // يعتبر "تم التسليم" فقط لو مكتوب "نعم"
            }));
        
        // ... (ترتيب الطلبات)
        const sortedOrders = orders.sort((a, b) => { /* ... */ });

        res.status(200).json(sortedOrders);
    } catch (error) {
        console.error('Google Sheet Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch orders from Google Sheets.', details: error.message });
    }
};
