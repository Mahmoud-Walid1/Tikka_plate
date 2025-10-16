const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { id } = req.body; // نستقبل رقم الفاتورة
        if (!id) {
            return res.status(400).json({ message: 'Invoice ID is missing.' });
        }

        const secretKey = process.env.MOYASAR_SECRET_KEY;

        // نتصل بميسّر ونسأل عن تفاصيل الفاتورة دي تحديدًا
        const response = await axios.get(`https://api.moyasar.com/v1/invoices/${id}`, {
            auth: {
                username: secretKey
            }
        });

        const invoice = response.data;

        // أهم خطوة: نتأكد إن حالة الفاتورة "مدفوعة" (paid)
        if (invoice.status !== 'paid') {
            return res.status(400).json({ message: 'Order is not paid yet.' });
        }

        // لو مدفوعة، نبدأ نجهز رسالة الواتساب للمطعم
        const cartItems = JSON.parse(invoice.metadata.cart_items);
        const customerPhone = invoice.metadata.customer_phone;
        const totalAmount = invoice.amount / 100; // نحول من هللات لريالات

        let orderDetails = '';
        cartItems.forEach(item => {
            orderDetails += `*- (${item.quantity})* ${item.name} | *${item.price * item.quantity} ريال*\n`;
        });

        const restaurantMessage = `
*✅ طلب جديد مدفوع أونلاين* 🔥
-----------------------------------
*رقم الفاتورة (ميسّر):* ${invoice.id}
*رقم جوال العميل:* ${customerPhone}
-----------------------------------
*الطلبات:*
${orderDetails}
-----------------------------------
*الإجمالي المدفوع: ${totalAmount} ريال*

(العميل أتم الدفع بنجاح، يرجى البدء في تحضير الطلب)
        `;

        // نرجع الرسالة الجاهزة للواجهة الأمامية
        res.status(200).json({
            status: 'success',
            message: restaurantMessage.trim()
        });

    } catch (error) {
        console.error('Confirmation Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Failed to confirm order details.' });
    }
};
