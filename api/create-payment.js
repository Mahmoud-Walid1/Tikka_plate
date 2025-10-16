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
        //  <<< بداية التعديل: غيرنا اسم الرابط لـ success_url ليتوافق مع الفواتير >>>
        const successUrl = `${protocol}://${host}/success.html?id={id}`;
        // <<< بداية التعديل: غيرنا الرابط إلى /v1/invoices لإنشاء صفحة دفع >>>
        const moyasarResponse = await axios.post('https://api.moyasar.com/v1/invoices', {
            // <<< بداية التعديل: استخدمنا Math.round() لضمان أن المبلغ رقم صحيح >>>
            amount: Math.round(amount),
            currency: 'SAR',
            description: description,
            success_url: successUrl,
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

        // <<< بداية التعديل: رابط صفحة الدفع الآن يأتي من moyasarResponse.data.url >>>
        res.status(200).json({ paymentUrl: moyasarResponse.data.url });

    } catch (error) {
        // هذا السطر مهم جدًا لأنه يطبع لنا الخطأ بالتفصيل في Vercel logs
        console.error('Moyasar API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'فشل في إنشاء عملية الدفع.' });
    }
};
