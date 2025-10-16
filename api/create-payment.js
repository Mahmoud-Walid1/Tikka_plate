// استخدمنا require وهي الطريقة الكلاسيكية
const axios = require('axios');

// وعدّلنا طريقة الـ export لتكون متوافقة مع require
module.exports = async (req, res) => {
    // نتأكد أن الطلب من نوع POST فقط
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { amount, cart, phone } = req.body;
        const secretKey = process.env.MOYASAR_SECRET_KEY;

        const description = `طلب من مطعم تكا بليت. إجمالي: ${amount / 100} ريال.`;
        
        const host = req.headers.host;
        const protocol = host.startsWith('localhost') ? 'http' : 'https';
        const callbackUrl = `${protocol}://${host}/success.html`;

        const moyasarResponse = await axios.post('https://api.moyasar.com/v1/payments', {
            amount: amount,
            currency: 'SAR',
            description: description,
            callback_url: callbackUrl,
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

        res.status(200).json({ paymentUrl: moyasarResponse.data.source.transaction_url });

    } catch (error) {
        console.error('Moyasar API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'فشل في إنشاء عملية الدفع.' });
    }
};
