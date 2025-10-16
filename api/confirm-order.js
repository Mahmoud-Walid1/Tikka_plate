const axios = require('axios');
// <<< بداية التعديل: هنستدعي أدوات المصادقة الجديدة >>>
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
// <<< نهاية التعديل >>>

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { id } = req.body;
        if (!id || id === '{id}') {
            return res.status(400).json({ message: 'Invoice ID is missing or invalid.' });
        }

        const secretKey = process.env.MOYASAR_SECRET_KEY;
        const moyasarResponse = await axios.get(`https://api.moyasar.com/v1/invoices/${id}`, {
            auth: { username: secretKey }
        });

        const invoice = moyasarResponse.data;
        if (invoice.status !== 'paid') {
            return res.status(400).json({ message: 'Order is not paid yet.' });
        }

        // <<< بداية التعديل: الطريقة الجديدة للمصادقة مع جوجل شيت >>>
        const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        const serviceAccountAuth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        // <<< نهاية التعديل: مش محتاجين السطر القديم بتاع useServiceAccountAuth >>>

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
        
        res.status(200).json({ status: 'success', message: 'Order confirmed and saved.' });

    } catch (error) {
        console.error('Confirmation Error:', error);
        res.status(500).json({ message: 'Failed to confirm order details.' });
    }
};
