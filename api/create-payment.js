const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { amount, cart, phone } = req.body;
        const secretKey = process.env.MOYASAR_SECRET_KEY;
        
        const host = req.headers.host;
        const protocol = host.startsWith('localhost') ? 'http' : 'https';
        const successUrl = `${protocol}://${host}/success.html`;

        // <<< === التعديل: رجعنا للطريقة الصحيحة وهي إنشاء "فاتورة" === >>>
        const moyasarResponse = await axios.post('https://api.moyasar.com/v1/invoices', {
            amount: Math.round(amount),
            currency: 'SAR',
            description: `طلب من تكا بليت لـ ${phone}`,
            success_url: successUrl,
            // الـ metadata دي مهمة جدًا عشان هتجيلنا في إشعار الدفع
            metadata: {
                customer_phone: phone,
                cart_items: JSON.stringify(cart)
            }
        }, {
            auth: {
                username: secretKey,
                password: ''
            }
        });

        // رابط صفحة الدفع في الفواتير هو moyasarResponse.data.url
        res.status(200).json({ paymentUrl: moyasarResponse.data.url });

    } catch (error) {
        console.error('Moyasar API Create Invoice Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'فشل في إنشاء عملية الدفع.' });
    }
};
