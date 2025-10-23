const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
  // 1. Password check
  const providedPassword = req.headers.authorization;
  const correctPassword = process.env.DASHBOARD_PASSWORD;
  if (!providedPassword || providedPassword !== correctPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 2. Get invoice ID
    const { invoiceId } = req.body;
    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is missing.' });
    }

    // 3. Google Sheets connection
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);

    // ✅ Auth setup
    const serviceAccountAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key.replace(/\\n/g, '\n'), // مهم جدًا
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // ✅ Connect to Sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    // 4. Find row by invoice ID
    const rowToUpdate = rows.find(row => row.get('رقم الفاتورة') === invoiceId);

    if (rowToUpdate) {
      rowToUpdate.set('تم التسليم', 'نعم');
      await rowToUpdate.save();
      res.status(200).json({ success: true });
    } else {
      console.warn(`Invoice ID ${invoiceId} not found in sheet.`);
      res.status(404).json({ error: 'Invoice ID not found.' });
    }
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ error: 'Failed to update order status.', details: error.message });
  }
};
