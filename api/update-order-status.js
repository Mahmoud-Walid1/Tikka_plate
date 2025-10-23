const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // 1. التحقق من كلمة المرور (زي ما هو)
    const providedPassword = req.headers.authorization;
    const correctPassword = process.env.DASHBOARD_PASSWORD;
     if (!providedPassword || providedPassword !== correctPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // <<< === بداية التعديل: هنستقبل رقم الفاتورة === >>>
        const { invoiceId } = req.body;
        if (!invoiceId) {
            return res.status(400).json({ error: 'Invoice ID is missing.' });
        }
        // <<< === نهاية التعديل === >>>

        // 2. الاتصال بجوجل شيت (زي ما هو)
        const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        const serviceAccountAuth = new JWT({ /* ... */ });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        
        await doc.loadInfo(); 
        const sheet = doc.sheetsByIndex[0]; 
        await sheet.loadHeaderRow();

        const rows = await sheet.getRows();

        // <<< === بداية التعديل: هندور برقم الفاتورة === >>>
        const rowToUpdate = rows.find(row => row.get('رقم الفاتورة') === invoiceId);
        // <<< === نهاية التعديل === >>>

        if (rowToUpdate) {
            rowToUpdate.set('تم التسليم', 'نعم');
            await rowToUpdate.save();
            res.status(200).json({ success: true });
        } else {
            console.warn(`Invoice ID ${invoiceId} not found in sheet.`); // رسالة أوضح للـ Logs
            res.status(404).json({ error: 'Invoice ID not found.' });
        }
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ error: 'Failed to update order status.', details: error.message });
    }
};

// --- JWT setup ---
const setupAuth = (creds) => {
 return new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
 });
}
