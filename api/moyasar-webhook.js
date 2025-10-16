const { GoogleSpreadsheet } = require('google-spreadsheet');
const crypto = require('crypto');

module.exports = async (req, res) => {
    if (req.method !== 'POST') { return res.status(405).end(); }

    // التحقق من التوقيع (زي ما هو متغيرش ومهم جدًا)
    const signature = req.headers['moyasar-signature'];
    const webhookSecret = process.env.MOYASAR_SECRET_KEY; // بنستخدم المفتاح السري العادي
    if (signature) { // هنتحقق فقط لو ميسّر بعتت توقيع
        const computedSignature = crypto.createHmac('sha265', webhookSecret).update(JSON.stringify(req.body)).digest('hex');
        if (signature !== computedSignature) {
            return res.status(401).send('Signature is not valid.');
        }
    }

    try {
        const event = req.body;

        // <<< === بداية التعديل المهم: هنستمع لـ payment.paid === >>>
        if (event.type === 'payment.paid') {
            const payment = event.data; // البيانات دلوقتي جاية من object اسمه payment

            // بما إن الـ metadata مش بتيجي مع الـ payment، هناخدها من الوصف
            // الوصف شكله كده: "طلب من مطعم تكا بليت. رقم التواصل: 0512345678"
            const description = payment.description;
            const customerPhone = description.split(': ')[1] || 'غير متوفر';
            const totalAmount = payment.amount / 100;

            // 1. نتصل بجوجل شيت
            const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
            const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
            await doc.useServiceAccountAuth(creds);
            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0];

            // 2. (خطوة أمان) نتأكد إننا مسجلناش الطلب ده قبل كده
            const rows = await sheet.getRows();
            const alreadyExists = rows.some(row => row.get('رقم الفاتورة') === payment.id);

            // 3. لو الطلب مش موجود، نسجله
            if (!alreadyExists) {
                await sheet.addRow({
                    'رقم الفاتورة': payment.id, // هنستخدم رقم الـ Payment كمرجع
                    'رقم العميل': customerPhone,
                    'تفاصيل الطلب': 'راجع الوصف - ' + description, // تفاصيل السلة مش بتيجي مع الـ payment
                    'الإجمالي المدفوع': totalAmount,
                    'حالة الدفع': payment.status,
                    'وقت الطلب': new Date().toLocaleString("en-GB", {timeZone: "Asia/Riyadh"})
                });
            }
        }
        // <<< === نهاية التعديل المهم === >>>
        
        res.status(200).send({ status: 'received' });

    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send({ error: 'Something went wrong.' });
    }
};
