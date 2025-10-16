const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // 1. نتأكد من كلمة المرور أولاً لحماية البيانات
    const providedPassword = req.headers.authorization;
    const correctPassword = process.env.DASHBOARD_PASSWORD;

    if (!providedPassword || providedPassword !== correctPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // 2. نتصل بملف جوجل شيت بنفس الطريقة الآمنة
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

        // 3. ننظم البيانات في شكل بسيط عشان الصفحة تفهمها
        const orders = rows.map(row => ({
            rowId: row.offset, // <<< === الإضافة المهمة: بنبعت رقم الصف الفريد === >>>
            InvoiceID: row.get('رقم الفاتورة'),
            CustomerPhone: row.get('رقم العميل'),
            OrderDetails: row.get('تفاصيل الطلب'),
            TotalAmount: row.get('الإجمالي المدفوع'),
            Status: row.get('حالة الدفع'),
            OrderTime: row.get('وقت الطلب'),
            Delivered: row.get('تم التسليم')
        }));
        
        // 4. نرتب الطلبات بحيث الأحدث يظهر فوق
        const sortedOrders = orders.sort((a, b) => new Date(b.OrderTime) - new Date(a.OrderTime));

        res.status(200).json(sortedOrders);
    } catch (error) {
        console.error('Google Sheet Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch orders from Google Sheets.' });
    }
};
