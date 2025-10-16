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
        const callbackUrl = `${protocol}://${host}/success.html`;

        // <<< === بداية التغيير الجذري: هنعمل "دفعة" بدل "فاتورة" === >>>
        const moyasarResponse = await axios.post('https://api.moyasar.com/v1/payments', {
            amount: Math.round(amount),
            currency: 'SAR',
            // الوصف مهم جدًا لأنه هيكون المصدر الوحيد لتفاصيل الطلب في جوجل شيت
            description: `طلب من تكا بليت لـ ${phone}`,
            callback_url: callbackUrl,
            // الـ metadata هتساعدنا لو حبينا نراجع الطلب في لوحة تحكم ميسّر
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
        // <<< === نهاية التغيير الجذري === >>>

        // رابط صفحة الدفع دلوقتي اسمه transaction_url
        res.status(200).json({ paymentUrl: moyasarResponse.data.source.transaction_url });

    } catch (error) {
        console.error('Moyasar API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'فشل في إنشاء عملية الدفع.' });
    }
};
