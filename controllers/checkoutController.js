const midtransClient = require('midtrans-client');
const crypto = require('crypto');
const Setting = require('../models/setting');
const User = require('../models/user');
const Voucher = require('../models/voucher');
const domainService = require('../services/domainService');

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

    if (cart.type === 'domain') {
        const period = cart.options.period || 1;
        const basePrice = cart.item.price;
        const whoisAddedPrice = cart.options.buy_whois_protection ? whoisBasePrice : 0;
        subtotal = (basePrice * period) + whoisAddedPrice;
    } else {
        subtotal = cart.item.price;
    }

    cart.pricing.subtotal = subtotal;
    let discountAmount = 0;
    if (cart.discount && cart.discount.percentage) {
        discountAmount = Math.round(subtotal * (cart.discount.percentage / 100));
        cart.discount.amount = discountAmount;
    }
    cart.pricing.finalPrice = subtotal - discountAmount;
    return cart;
};

const fulfillOrder = async (cart, user) => {
    if (cart.type === 'domain') {
        const userDetails = await User.findById(user.id);
        const domainData = {
            name: cart.item.domain,
            period: cart.options.period,
            customer_id: userDetails.customerId,
            buy_whois_protection: cart.options.buy_whois_protection || false
        };
        await domainService.registerDomain(domainData);
    }
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
        const user = await User.findById(req.session.user.id);
        const settings = await Setting.findOne() || new Setting();
        req.session.cart = calculatePrices(req.session.cart, settings);
        
        res.render('checkout', {
            user: user,
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

exports.processCheckout = async (req, res) => {
    const { payment_method } = req.body;
    if (!req.session.cart) {
        req.flash('error_msg', 'Keranjang Anda kosong.');
        return res.redirect('/');
    }

    try {
        const user = await User.findById(req.session.user.id);
        const settings = await Setting.findOne() || new Setting();
        const cart = calculatePrices(req.session.cart, settings);
        const finalPrice = cart.pricing.finalPrice;

        if (payment_method === 'credit') {
            if (user.creditBalance < finalPrice) {
                req.flash('error_msg', 'Saldo Anda tidak mencukupi untuk transaksi ini.');
                return res.redirect('/checkout');
            }

            user.creditBalance -= finalPrice;
            await user.save();
            req.session.user.creditBalance = user.creditBalance;

            await fulfillOrder(cart, req.session.user);

            delete req.session.cart;
            req.flash('success_msg', 'Pembayaran dengan saldo berhasil! Layanan Anda sedang diaktifkan.');
            return res.redirect('/dashboard');

        } else {
            const orderId = `TRX-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
            const parameter = {
                transaction_details: { order_id: orderId, gross_amount: finalPrice },
                customer_details: { first_name: user.name, email: user.email, phone: user.voice }
            };
            req.session.pending_order = { order_id: orderId, cart: cart, user_id: user._id };
            const token = await snap.createTransactionToken(parameter);
            return res.json({ token });
        }
    } catch (error) {
        console.error("ERROR di processCheckout:", error);
        req.flash('error_msg', `Gagal memproses pembayaran: ${error.message}`);
        res.redirect('/checkout');
    }
};