const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // ... (بداية الملف والتحقق من كلمة السر زي ما هي) ...
    const providedPassword = req.headers.authorization;
    // ...
    try {
        const { rowId } = req.body;
        if (rowId === undefined) {
            return res.status(400).json({ error: 'Row ID is missing.' });
        }

        // ... (الاتصال بجوجل شيت زي ما هو) ...
        const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        // ...
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();

        const rowToUpdate = rows.find(row => row.offset === rowId);
        if (rowToUpdate) {
            rowToUpdate.set('تم التسليم', 'نعم');
            await rowToUpdate.save();
            res.status(200).json({ success: true });
        } else {
            res.status(404).json({ error: 'Row not found.' });
        }
    } catch (error) {
        // ... (نهاية الملف زي ما هي) ...
    }
};
