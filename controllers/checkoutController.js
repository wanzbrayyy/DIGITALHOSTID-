const midtransClient = require('midtrans-client');
const crypto = require('crypto');
const Setting = require('../models/setting');
const User = require('../models/user');
const Voucher = require('../models/voucher');

const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

const calculatePrices = (cart, settings) => {
    cart.options = cart.options || { period: 1 };
    cart.pricing = {};

    const whoisBasePrice = settings.prices.whois;
    let subtotal = 0;
    let whoisAddedPrice = 0;

    if (cart.type === 'domain') {
        const period = cart.options.period || 1;
        const basePrice = cart.item.price;
        whoisAddedPrice = cart.options.buy_whois_protection ? whoisBasePrice : 0;
        subtotal = (basePrice * period) + whoisAddedPrice;
    } else {
        subtotal = cart.item.price;
    }

    cart.pricing.subtotal = subtotal;
    cart.pricing.whoisAddedPrice = whoisAddedPrice;

    let discountAmount = 0;
    if (cart.discount && cart.discount.code) {
        discountAmount = Math.round(subtotal * (cart.discount.percentage / 100));
        cart.discount.amount = discountAmount;
    }

    cart.pricing.finalPrice = subtotal - discountAmount;
    return cart;
};

exports.addToCart = (req, res) => {
    const { type, plan, price } = req.body;
    req.session.cart = {
        type: type,
        item: { name: plan, price: parseFloat(price) || 0 },
        options: { period: 1 }
    };
    if (req.session.user) res.redirect('/checkout');
    else res.redirect(`/register?plan=${encodeURIComponent(plan)}`);
};

exports.getCheckoutPage = async (req, res) => {
    if (!req.session.cart) {
        req.flash('error_msg', 'Keranjang Anda kosong.');
        return res.redirect('/');
    }
    try {
        const settings = await Setting.findOne() || new Setting();
        req.session.cart = calculatePrices(req.session.cart, settings);
        
        res.render('checkout', {
            user: req.session.user,
            cart: req.session.cart,
            clientKey: process.env.MIDTRANS_CLIENT_KEY,
            title: 'Checkout Pesanan'
        });
    } catch (error) {
        req.flash('error_msg', `Terjadi kesalahan: ${error.message}`);
        res.redirect('/');
    }
};

exports.updateCartOptions = (req, res) => {
    if (!req.session.cart || req.session.cart.type !== 'domain') {
        return res.redirect('/checkout');
    }
    const { period, buy_whois_protection } = req.body;
    req.session.cart.options = {
        period: parseInt(period) || 1,
        buy_whois_protection: buy_whois_protection === 'on'
    };
    res.redirect('/checkout');
};

exports.applyVoucher = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code || !req.session.cart) return res.redirect('/checkout');

        const voucher = await Voucher.findOne({ code: code.toUpperCase() });
        if (!voucher || !voucher.isActive || new Date(voucher.expiryDate) < new Date()) {
            req.flash('error_msg', 'Voucher tidak valid atau sudah kedaluwarsa.');
            return res.redirect('/checkout');
        }

        req.session.cart.discount = {
            code: voucher.code,
            percentage: voucher.discount
        };
        
        req.flash('success_msg', `Voucher ${voucher.code} berhasil diterapkan.`);
        res.redirect('/checkout');

    } catch (error) {
        req.flash('error_msg', `Gagal menerapkan voucher: ${error.message}`);
        res.redirect('/checkout');
    }
};

exports.removeVoucher = (req, res) => {
    if (req.session.cart && req.session.cart.discount) {
        delete req.session.cart.discount;
        req.flash('success_msg', 'Voucher berhasil dihapus.');
    }
    res.redirect('/checkout');
};

exports.processPayment = async (req, res) => {
    try {
        if (!req.session.cart) return res.status(400).json({ error: 'Sesi keranjang tidak valid.' });
        
        const user = await User.findById(req.session.user.id);
        const settings = await Setting.findOne() || new Setting();
        const cart = calculatePrices(req.session.cart, settings);
        
        const orderId = `TRX-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const parameter = {
            transaction_details: { order_id: orderId, gross_amount: cart.pricing.finalPrice },
            customer_details: { first_name: user.name, email: user.email, phone: user.voice }
        };

        req.session.pending_order = { order_id: orderId, cart: cart, user_id: user._id };
        const token = await snap.createTransactionToken(parameter);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Gagal memproses pembayaran: ' + error.message });
    }
};