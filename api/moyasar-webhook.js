const { GoogleSpreadsheet } = require('google-spreadsheet');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    try {
        const event = req.body;

        // <<< === هنتأكد إننا بنستمع للحدث الصحيح: payment.paid === >>>
        if (event.type === 'payment.paid') {
            const payment = event.data;
            // الـ metadata اللي حطيناها في الفاتورة بتوصلنا هنا
            const metadata = payment.metadata || {};

            const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
            const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
            await doc.useServiceAccountAuth(creds);
            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0];

            const rows = await sheet.getRows();
            const alreadyExists = rows.some(row => row.get('رقم الفاتورة') === payment.id);

            if (!alreadyExists) {
                // هنحاول نجيب التفاصيل من الـ metadata
                let orderDetailsText = 'التفاصيل لم تصل، راجع لوحة تحكم ميسّر.';
                if (metadata.cart_items) {
                    const cartItems = JSON.parse(metadata.cart_items);
                    orderDetailsText = '';
                    cartItems.forEach(item => {
                        orderDetailsText += `- (${item.quantity}) ${item.name}\n`;
                    });
                }
                
                await sheet.addRow({
                    'رقم الفاتورة': payment.id,
                    'رقم العميل': metadata.customer_phone || 'غير متوفر',
                    'تفاصيل الطلب': orderDetailsText.trim(),
                    'الإجمالي المدفوع': payment.amount / 100,
                    'حالة الدفع': payment.status,
                    'وقت الطلب': new Date().toLocaleString("en-GB", {timeZone: "Asia/Riyadh"})
                });
            }
        }
        
        res.status(200).send({ status: 'received' });

    } catch (error)
        console.error('Webhook Error:', error);
        res.status(500).send({ error: 'Something went wrong.' });
    }
};
