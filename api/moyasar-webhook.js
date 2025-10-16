const { GoogleSpreadsheet } = require('google-spreadsheet');
const crypto = require('crypto'); // نستدعي مكتبة التشفير

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    // <<< بداية خطوة التحقق من التوقيع >>>
    const signature = req.headers['moyasar-signature'];
    const webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET;

    if (!signature) {
        return res.status(401).send('Signature is missing.');
    }

    const computedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (signature !== computedSignature) {
        return res.status(401).send('Signature is not valid.');
    }
    // <<< نهاية خطوة التحقق من التوقيع >>>

    try {
        const event = req.body;

        if (event.type === 'invoice.paid') {
            const invoice = event.data;
            
            const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
            const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
            await doc.useServiceAccountAuth(creds);
            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0];

            const rows = await sheet.getRows();
            const alreadyExists = rows.some(row => row.get('رقم الفاتورة') === invoice.id);

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
