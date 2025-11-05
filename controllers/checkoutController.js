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

        // **PERBAIKAN UTAMA: Kirim HANYA data yang dibutuhkan oleh API**
        const domainData = {
            name: cart.item.domain,
            period: cart.options.period,
            customer_id: userDetails.customerId,
            buy_whois_protection: cart.options.buy_whois_protection || false,
            'nameserver[0]': 'ns1.digitalhostid.co.id',
            'nameserver[1]': 'ns2.digitalhostid.co.id',
            'contact[registrant][name]': userDetails.name,
            'contact[registrant][email]': userDetails.email,
            'contact[registrant][organization]': userDetails.organization,
            'contact[registrant][street_1]': userDetails.street_1,
            'contact[registrant][city]': userDetails.city,
            'contact[registrant][state]': userDetails.state,
            'contact[registrant][postal_code]': userDetails.postal_code,
            'contact[registrant][country_code]': userDetails.country_code || 'ID',
            'contact[registrant][voice]': userDetails.voice,
        };

        const registrationResponse = await domainService.registerDomain(domainData);

        if (registrationResponse && registrationResponse.data && registrationResponse.data.id) {
            const domainId = registrationResponse.data.id;
            await domainService.createDnsZone(domainId);
        }
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
    req.session.cart.options.period = parseInt(req.body.period) || 1;
    req.session.cart.options.buy_whois_protection = req.body.buy_whois_protection === 'on';
    res.redirect('/checkout');
};

exports.updateCartDomain = async (req, res) => {
    const { newDomain } = req.body;
    if (!req.session.cart || req.session.cart.type !== 'domain') {
        return res.status(400).json({ success: false, message: 'Keranjang tidak valid.' });
    }
    if (!newDomain || !newDomain.includes('.')) {
        return res.status(400).json({ success: false, message: 'Format domain tidak valid.' });
    }

    try {
        const settings = await Setting.findOne() || new Setting();
        const tldWithDot = `.${newDomain.split('.').slice(1).join('.')}`;
        const tldWithoutDot = tldWithDot.substring(1);
        const safeTldKey = tldWithoutDot.replace(/\./g, '_');
        const overridePrice = settings.prices.tld.get(safeTldKey);

        let finalPrice;

        if (overridePrice) {
            finalPrice = overridePrice;
        } else {
            const priceData = await domainService.listAllDomainPrices({ 'domainExtension[extension]': tldWithDot });
            const apiPriceInfo = priceData.data[0];

            if (!apiPriceInfo) {
                finalPrice = 150000;
            } else {
                const apiPromoPrice = apiPriceInfo.promo_registration?.registration?.['1'];
                const apiNormalPrice = apiPriceInfo.registration['1'];
                finalPrice = apiPromoPrice || apiNormalPrice;
            }
        }

        req.session.cart.item.domain = newDomain;
        req.session.cart.item.price = parseFloat(finalPrice);

        req.session.save(err => {
            if (err) return res.status(500).json({ success: false, message: 'Gagal menyimpan sesi.' });
            res.json({ success: true, message: 'Domain di keranjang berhasil diperbarui.' });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: `Terjadi kesalahan server: ${error.message}` });
    }
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
        req.session.cart.discount = { code: voucher.code, percentage: voucher.discount };
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
                req.flash('error_msg', 'Saldo Anda tidak mencukupi.');
                return res.redirect('/checkout');
            }

            user.creditBalance -= finalPrice;
            await user.save();
            req.session.user.creditBalance = user.creditBalance;

            await fulfillOrder(cart, req.session.user);
            delete req.session.cart;
            
            // **PERBAIKAN: Redirect dengan query parameter, jangan pakai flash di sini**
            return res.redirect('/dashboard?registration=processing');

        } else if (payment_method === 'midtrans') {
            const orderId = `TRX-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
            const parameter = {
                transaction_details: { order_id: orderId, gross_amount: finalPrice },
                customer_details: { first_name: user.name, email: user.email, phone: user.voice }
            };
            req.session.pending_order = { order_id: orderId, cart: cart, user_id: user._id };
            const token = await snap.createTransactionToken(parameter);
            return res.json({ token });
        } else {
            req.flash('error_msg', 'Metode pembayaran tidak valid.');
            return res.redirect('/checkout');
        }
    } catch (error) {
        console.error("ERROR di processCheckout:", error);
        req.flash('error_msg', `Gagal memproses pembayaran: ${error.message}`);
        res.redirect('/checkout');
    }
};