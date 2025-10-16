// /api/create-payment.js

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const { amount, description } = request.body;
    const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY;

    if (!MOYASAR_SECRET_KEY) {
        return response.status(500).json({ success: false, message: 'Moyasar API key is not configured.' });
    }
    
    // The amount from frontend is in SAR, Moyasar needs it in Halalas (multiply by 100)
    const amountInHalalas = Math.round(parseFloat(amount) * 100);

    const moyasarApiUrl = 'https://api.moyasar.com/v1/invoices';

    try {
        const moyasarResponse = await fetch(moyasarApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(MOYASAR_SECRET_KEY + ':').toString('base64')}`
            },
            body: JSON.stringify({
                amount: amountInHalalas,
                currency: 'SAR',
                description: description || 'طلب جديد من مطعم تكا بليت',
                callback_url: 'https://tikka-plate.vercel.app/' // IMPORTANT: Change this to your actual success page URL
            }),
        });

        const data = await moyasarResponse.json();

        if (!moyasarResponse.ok) {
            // Forward Moyasar's error message if available
            const errorMessage = data.message || 'An error occurred with the payment gateway.';
            console.error('Moyasar Error:', data);
            throw new Error(errorMessage);
        }

        response.status(200).json({ success: true, payment_url: data.url });

    } catch (error) {
        console.error('Internal Server Error:', error);
        response.status(500).json({ success: false, message: error.message });
    }
}
