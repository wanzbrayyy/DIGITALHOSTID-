const domainService = require('../services/domainService');
const User = require('../models/user');
const Setting = require('../models/setting');

exports.getOrderPage = async (req, res) => {
    try {
        const priceItem = await domainService.showSslProductWithPrice(req.params.priceId);
        if (!priceItem) {
            req.flash('error_msg', 'Produk SSL tidak ditemukan.');
            return res.redirect('/ssl');
        }
        
        res.render('ssl/order-ssl', {
            user: req.session.user,
            product: priceItem.product,
            price_id: priceItem.id,
            title: `Pesan ${priceItem.product.name}`
        });
    } catch (error) {
        req.flash('error_msg', `Gagal memuat halaman pesanan: ${error.message}`);
        res.redirect('/ssl');
    }
};
exports.generateCsrAndConfirm = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const priceItem = await domainService.showSslProductWithPrice(req.params.priceId);
        
        const settings = await Setting.findOne() || new Setting();
        const sslPriceOverrides = settings.prices.ssl;
        const overridePrice = sslPriceOverrides.get(priceItem.product.name);
        const displayPrice = overridePrice || parseFloat(priceItem['1']);

        const csrData = { 
            ssl_product_id: priceItem.product.id,
            csr_country: user.country_code || 'ID',
            ...req.body 
        };
        const csrResponse = await domainService.generateCsr(csrData);

        if (!csrResponse || !csrResponse.data || !csrResponse.data.csr) {
            throw new Error('API tidak mengembalikan CSR yang valid.');
        }

        res.render('ssl/confirm-ssl-order', {
            user: user,
            product: priceItem.product,
            price_id: priceItem.id,
            displayPrice: displayPrice,
            csr: csrResponse.data,
            title: 'Konfirmasi Pesanan SSL'
        });
    } catch (error) {
        // **JEBAKAN DEBUGGING DI SINI**
        console.error("--- ERROR DITANGKAP OLEH SSL CONTROLLER ---");
        console.error(error);
        console.error("-----------------------------------------");
        
        req.flash('error_msg', `Gagal membuat CSR: ${error.message}`);
        res.redirect(`/ssl/order/${req.params.priceId}`);
    }
};

exports.processSslOrder = async (req, res) => {
    try {
        const { csr_code, dcv_method } = req.body;
        const user = await User.findById(req.session.user.id);
        const priceItem = await domainService.showSslProductWithPrice(req.params.priceId);
        
        const contactDetails = {
            firstname: user.name.split(' ')[0],
            lastname: user.name.split(' ').slice(1).join(' ') || user.name.split(' ')[0],
            organization: user.organization || user.name,
            address: user.street_1,
            phone: user.voice,
            title: 'IT',
            email: user.email,
            city: user.city,
            country: user.country_code,
            postal_code: user.postal_code,
        };
        
        const orderData = {
            ssl_product_id: priceItem.product.id,
            customer_id: user.customerId,
            dcv_method,
            period: 12,
            csr_code,
            ...Object.fromEntries(Object.entries(contactDetails).map(([k, v]) => [`admin_${k}`, v])),
            ...Object.fromEntries(Object.entries(contactDetails).map(([k, v]) => [`tech_${k}`, v])),
        };

        await domainService.orderSsl(orderData);
        
        req.flash('success_msg', 'Pesanan SSL Anda telah berhasil dibuat dan sedang diproses. Silakan selesaikan validasi domain.');
        res.redirect('/dashboard');

    } catch (error) {
        req.flash('error_msg', `Gagal memproses pesanan SSL: ${error.message}`);
        res.redirect(`/ssl/order/${req.params.priceId}`);
    }
};