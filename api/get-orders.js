const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // 1. التحقق من كلمة المرور
    const providedPassword = req.headers.authorization;
    const correctPassword = process.env.DASHBOARD_PASSWORD;
    if (!providedPassword || providedPassword !== correctPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // 2. الاتصال بجوجل شيت
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

        // 3. تنظيم البيانات (مع إضافة قيم افتراضية لتجنب الأخطاء)
        const orders = rows.map(row => ({
            rowId: row.offset,
            InvoiceID: row.get('رقم الفاتورة') || 'غير متوفر',
            CustomerPhone: row.get('رقم العميل') || 'غير متوفر',
            OrderDetails: row.get('تفاصيل الطلب') || 'لا توجد تفاصيل',
            TotalAmount: row.get('الإجمالي المدفوع') || '0',
            Status: row.get('حالة الدفع') || 'غير معروف',
            OrderTime: row.get('وقت الطلب') || 'غير معروف',
            Delivered: row.get('تم التسليم') || false // لو الخلية فاضية، نعتبره "لم يتم التسليم"
        }));
        
        // 4. ترتيب الطلبات
        const sortedOrders = orders.sort((a, b) => {
            // التحويل لوقت صحيح للمقارنة
            const dateA = new Date(a.OrderTime.split(',')[0].split('/').reverse().join('-') + 'T' + a.OrderTime.split(', ')[1]);
            const dateB = new Date(b.OrderTime.split(',')[0].split('/').reverse().join('-') + 'T' + b.OrderTime.split(', ')[1]);
            return dateB - dateA;
        });

        res.status(200).json(sortedOrders);
    } catch (error) {
        console.error('Google Sheet Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch orders from Google Sheets.' });
    }
};
