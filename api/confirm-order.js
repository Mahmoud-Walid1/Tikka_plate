const axios = require('axios');
//  <<< بداية الإضافة: استدعاء مكتبة جوجل شيت >>>
const { GoogleSpreadsheet } = require('google-spreadsheet');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { id } = req.body; // نستقبل رقم الفاتورة من صفحة النجاح
        if (!id) { return res.status(400).json({ message: 'Invoice ID is missing.' }); }

        // 1. نتأكد من الدفع عن طريق ميسّر (زي ما هي متغيرتش)
        const secretKey = process.env.MOYASAR_SECRET_KEY;
        const moyasarResponse = await axios.get(`https://api.moyasar.com/v1/invoices/${id}`, {
            auth: { username: secretKey }
        });

        const invoice = moyasarResponse.data;
        if (invoice.status !== 'paid') {
            return res.status(400).json({ message: 'Order is not paid yet.' });
        }

        // <<< === بداية التغيير الجذري: تسجيل الطلب في جوجل شيت === >>>

        // 2. إعداد الاتصال بملف جوجل شيت
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
        const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        await doc.useServiceAccountAuth(creds);
        await doc.loadInfo(); // تحميل معلومات الملف
        const sheet = doc.sheetsByIndex[0]; // اختيار أول شيت في الملف

        // 3. نجهز البيانات اللي هنضيفها
        const cartItems = JSON.parse(invoice.metadata.cart_items);
        let orderDetailsText = '';
        cartItems.forEach(item => {
            orderDetailsText += `- (${item.quantity}) ${item.name}\n`;
        });
        
        // 4. نضيف سطر جديد في الشيت بالبيانات دي
        await sheet.addRow({
            'رقم الفاتورة': invoice.id,
            'رقم العميل': invoice.metadata.customer_phone,
            'تفاصيل الطلب': orderDetailsText.trim(),
            'الإجمالي المدفوع': invoice.amount / 100,
            'حالة الدفع': invoice.status,
            'وقت الطلب': new Date().toLocaleString("en-GB", {timeZone: "Asia/Riyadh"})
        });
        // <<< === نهاية التغيير الجذري === >>>
        
        res.status(200).json({ status: 'success', message: 'Order confirmed and saved to Google Sheets.' });

    } catch (error) {
        console.error('Confirmation Error:', error);
        res.status(500).json({ message: 'Failed to confirm order details.' });
    }
};
