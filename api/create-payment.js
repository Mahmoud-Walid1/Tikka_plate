// لاستخدام axios نحتاج نثبته الأول
// افتح الـ Terminal واكتب: npm install axios
// ولو معندكش package.json اكتب الأول: npm init -y
const axios = require('axios');

export default async function handler(req, res) {
    // نتأكد أن الطلب من نوع POST فقط
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { amount, cart, phone } = req.body;
        const secretKey = process.env.MOYASAR_SECRET_KEY;

        // وصف الطلب اللي هيظهر للعميل في صفحة الدفع
        const description = `طلب من مطعم تكا بليت. إجمالي: ${amount / 100} ريال.`;
        
        // رابط صفحة الشكر اللي هيرجع لها العميل بعد الدفع بنجاح
        const callbackUrl = `${process.env.VERCEL_URL}/success.html`;

        const moyasarResponse = await axios.post('https://api.moyasar.com/v1/payments', {
            amount: amount,
            currency: 'SAR',
            description: description,
            callback_url: callbackUrl,
            metadata: {
                customer_phone: phone,
                cart_items: JSON.stringify(cart) // نحفظ تفاصيل السلة في ميسّر
            }
        }, {
            // المصادقة باستخدام المفتاح السري
            auth: {
                username: secretKey,
                password: ''
            }
        });

        // نرسل رابط الدفع إلى الـ Frontend
        res.status(200).json({ paymentUrl: moyasarResponse.data.source.transaction_url });

    } catch (error) {
        console.error('Moyasar API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'فشل في إنشاء عملية الدفع.' });
    }
}
