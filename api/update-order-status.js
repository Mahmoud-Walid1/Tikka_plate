const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // 1. نتأكد إن ده طلب تعديل وإن معاه كلمة السر
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const providedPassword = req.headers.authorization;
    const correctPassword = process.env.DASHBOARD_PASSWORD;
    if (!providedPassword || providedPassword !== correctPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { rowId } = req.body; // نستقبل رقم الصف اللي عايزين نعدله
        if (!rowId) {
            return res.status(400).json({ error: 'Row ID is missing.' });
        }

        // 2. نتصل بجوجل شيت
        const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        const serviceAccountAuth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();

        // 3. نلاقي الصف المطلوب ونعدله
        const rowToUpdate = rows.find(row => row.offset === rowId);
        if (rowToUpdate) {
            rowToUpdate.set('تم التسليم', 'TRUE'); // نعمل علامة صح في المربع
            await rowToUpdate.save(); // نحفظ التغيير
            res.status(200).json({ success: true, message: `Order ${rowId} marked as completed.` });
        } else {
            res.status(404).json({ error: 'Row not found.' });
        }
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ error: 'Failed to update order status.' });
    }
};
