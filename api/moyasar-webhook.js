const { GoogleSpreadsheet } = require('google-spreadsheet');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    try {
        const event = req.body;

        // نستمع فقط للحدث اللي يهمنا: لما الفاتورة تتدفع
        if (event.type === 'invoice.paid') {
            const invoice = event.data;
            
            const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
            const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
            await doc.useServiceAccountAuth(creds);
            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0];

            // (خطوة أمان) نتأكد إننا مسجلناش الطلب ده قبل كده
            const rows = await sheet.getRows();
            const alreadyExists = rows.some(row => row.get('رقم الفاتورة') === invoice.id);

            // لو الطلب مش موجود، نسجله
            if (!alreadyExists) {
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
            }
        }
        
        res.status(200).send({ status: 'received' });

    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send({ error: 'Something went wrong.' });
    }
};
