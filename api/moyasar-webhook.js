// ملف: api/moyasar-webhook.js

// هذا الملف وظيفته الوحيدة هي تسجيل أي إشارة تصله من ميسّر
module.exports = async (req, res) => {
    
    console.log("--- !!! WEBHOOK RECEIVED !!! ---");
    console.log("Body:", JSON.stringify(req.body, null, 2));
    
    // نرد على ميسّر بنجاح عشان يعرف إننا استلمنا الإشارة
    res.status(200).send({ status: 'received' });
};
