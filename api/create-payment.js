// بداية التعديل: غيرنا طريقة الاستدعاء لتكون متوافقة
import axios from 'axios';

export default async function handler(req, res) {
    // نتأكد أن الطلب من نوع POST فقط
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { amount, cart, phone } = req.body;
        const secretKey = process.env.MOYASAR_SECRET_KEY;

        // وصف الطلب الذي سيظهر للعميل في صفحة الدفع
        const description = `طلب من مطعم تكا بليت. إجمالي: ${amount / 100} ريال.`;
        
        // رابط صفحة الشكر الذي سيعود إليه العميل بعد الدفع بنجاح
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
        // طباعة الخطأ في Vercel logs لمعرفة المشكلة لو تكررت
        console.error('Moyasar API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'فشل في إنشاء عملية الدفع.' });
    }
}
