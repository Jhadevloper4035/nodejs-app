const mongoose = require('mongoose');



const cartSchema = new mongoose.Schema({
    userId: {

        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            name: { type: String, required: true },
            slug: { type: String },
            image: { type: String },
            price: { type: Number, required: true }, // always from DB, never client
            quantity: { type: Number, required: true, min: 1, max: 99 }
        }

    ]
}, {

    timestamps: true
});

// Virtual: total item count
cartSchema.virtual('totalItems').get(function () {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
});

// Virtual: total price
cartSchema.virtual('totalPrice').get(function () {
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
});

// Ensure virtuals appear in JSON if you ever send full cart
cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cart', cartSchema);
