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

        const moyasarResponse = await axios.post('https://api.moyasar.com/v1/payments', {
            // عالجنا مشكلة المبلغ عشان نتأكد إنه رقم صحيح
            amount: Math.round(amount),
            currency: 'SAR',
            description: `طلب من تكا بليت لـ ${phone}`,
            callback_url: callbackUrl,
            
            // <<< === بداية التعديل المهم: هنا بنقول لميسّر افتح "باب العملاء" === >>>
            source: {
                "type": "creditcard"
            },
            // <<< === نهاية التعديل المهم === >>>
            
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

        // رابط صفحة الدفع دلوقتي اسمه transaction_url
        res.status(200).json({ paymentUrl: moyasarResponse.data.source.transaction_url });

    } catch (error) {
        // السطر ده مهم عشان لو حصل أي خطأ تاني نعرفه
        console.error('Moyasar API Create Payment Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'فشل في إنشاء عملية الدفع.' });
    }
};
