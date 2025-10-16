const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { amount, cart, phone } = req.body;
        const secretKey = process.env.MOYASAR_SECRET_KEY;

        const description = `طلب من مطعم تكا بليت. رقم التواصل: ${phone}`;
        
        const host = req.headers.host;
        const protocol = host.startsWith('localhost') ? 'http' : 'https';

        // <<< === بداية التعديل المهم: أضفنا ?id={id} في آخر الرابط === >>>
       const successUrl = `${protocol}://${host}/success.html?id={id}`;
        // <<< === نهاية التعديل المهم === >>>

        const moyasarResponse = await axios.post('https://api.moyasar.com/v1/invoices', {
            amount: Math.round(amount),
            currency: 'SAR',
            description: description,
            success_url: successUrl, // هنا استخدمنا الرابط المعدل
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

        res.status(200).json({ paymentUrl: moyasarResponse.data.url });

    } catch (error) {
        console.error('Moyasar API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'فشل في إنشاء عملية الدفع.' });
    }
};
