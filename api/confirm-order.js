const axios = require('axios');
const { GoogleSpreadsheet } = require('google-spreadsheet');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { id } = req.body;
        if (!id) { return res.status(400).json({ message: 'Invoice ID is missing.' }); }

        const secretKey = process.env.MOYASAR_SECRET_KEY;
        
        // <<< === بداية التعديل: استخدمنا الـ backticks (`) بدلًا من (' ) === >>>
        const moyasarResponse = await axios.get(`https://api.moyasar.com/v1/invoices/${id}`, {
            auth: { username: secretKey }
        });
        // <<< === نهاية التعديل === >>>

        const invoice = moyasarResponse.data;
        if (invoice.status !== 'paid') {
            return res.status(400).json({ message: 'Order is not paid yet.' });
        }

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
        const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        await doc.useServiceAccountAuth(creds);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        const cartItems = JSON.parse(invoice.metadata.cart_items);
        let orderDetailsText = '';
        cartItems.forEach(item => {
            orderDetailsText += `- (${item.quantity}) ${item.name}\n`;
        });
        
        await sheet.addRow({
            'رقم الفاتورة': invoice.id,
            'رقم العميل': invoice.metadata.customer_phone,
            'تفاصيل الطلب': orderDetailsText.trim(),
            'الإجمالي المدفوع': invoice.amount / 100,
            'حالة الدفع': invoice.status,
            'وقت الطلب': new Date().toLocaleString("en-GB", {timeZone: "Asia/Riyadh"})
        });
        
        res.status(200).json({ status: 'success', message: 'Order confirmed and saved to Google Sheets.' });

    } catch (error) {
        // السطر ده هو اللي بيطبعلنا الأخطاء بالتفصيل في Vercel logs
        console.error('Confirmation Error:', error.response ? error.response.data : error);
        res.status(500).json({ message: 'Failed to confirm order details.' });
    }
};
