// ... (بداية الملف زي ما هي)
module.exports = async (req, res) => {
    // ... (التحقق من كلمة السر زي ما هو)
    try {
        // ... (الاتصال بجوجل شيت زي ما هو)
        const rows = await sheet.getRows();

        const orders = rows.map(row => ({
            rowId: row.offset, // <<< === الإضافة المهمة: بنبعت رقم الصف الفريد === >>>
            InvoiceID: row.get('رقم الفاتورة'),
            CustomerPhone: row.get('رقم العميل'),
            OrderDetails: row.get('تفاصيل الطلب'),
            TotalAmount: row.get('الإجمالي المدفوع'),
            Status: row.get('حالة الدفع'),
            OrderTime: row.get('وقت الطلب'),
            Delivered: row.get('تم التسليم') // <<< === الإضافة المهمة: بنبعت حالة التسليم === >>>
        }));
        
        const sortedOrders = orders.sort((a, b) => new Date(b.OrderTime) - new Date(a.OrderTime));
        res.status(200).json(sortedOrders);
    } catch (error) {
        // ... (نهاية الملف زي ما هي)
    }
};
