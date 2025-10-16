const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // 1. Authenticate the request
    const providedPassword = req.headers.authorization;
    const correctPassword = process.env.DASHBOARD_PASSWORD;
    if (!providedPassword || providedPassword !== correctPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { rowId } = req.body;
        if (rowId === undefined) {
            return res.status(400).json({ error: 'Row ID is missing.' });
        }

        // 2. Connect to Google Sheets
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

        // 3. Find the row and update it
        const rowToUpdate = rows.find(row => row.offset === rowId);
        if (rowToUpdate) {
            rowToUpdate.set('تم التسليم', 'نعم');
            await rowToUpdate.save();
            res.status(200).json({ success: true });
        } else {
            res.status(404).json({ error: 'Row not found.' });
        }
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ error: 'Failed to update order status.' });
    }
};
