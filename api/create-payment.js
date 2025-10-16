const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { amount, phone } = req.body;
        const secretKey = process.env.MOYASAR_SECRET_KEY;
        
        if (!amount || amount <= 0) {
            console.error("Attempted to create payment with invalid amount:", amount);
            return res.status(400).json({ message: 'المبلغ غير صالح.' });
        }

        const host = req.headers.host;
        const protocol = host.startsWith('localhost') ? 'http' : 'https';
        const callbackUrl = `${protocol}://${host}/success.html`;

        const moyasarResponse = await axios.post('https://api.moyasar.com/v1/payments', {
            amount: Math.round(amount),
            currency: 'SAR',
            description: `طلب من تكا بليت لـ ${phone}`,
            callback_url: callbackUrl,
        }, {
            auth: {
                username: secretKey,
                password: ''
            }
        });

        res.status(200).json({ paymentUrl: moyasarResponse.data.source.transaction_url });

    } catch (error) {
        // <<< === السطر ده هيطبع لنا رد ميسّر بالكامل عشان نعرف سبب الفشل === >>>
        console.error('Moyasar API Create Payment Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'فشل في إنشاء عملية الدفع.' });
    }
};
