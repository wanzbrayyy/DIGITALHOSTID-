const domainService = require('../services/domainService');
const User = require('../models/user');
const Setting = require('../models/setting');
exports.getOrderPage = async (req, res) => {
    try {
        const product = await domainService.showSslProductWithPrice(req.params.productId);
        if (!product) {
            req.flash('error_msg', 'Produk SSL tidak ditemukan.');
            return res.redirect('/ssl');
        }
        res.render('ssl/order-ssl', {
            user: req.session.user,
            product,
            title: `Pesan ${product.name}`
        });
    } catch (error) {
        req.flash('error_msg', `Gagal memuat halaman pesanan: ${error.message}`);
        res.redirect('/ssl');
    }
};
exports.generateCsrAndConfirm = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const product = await domainService.showSslProductWithPrice(req.params.productId);

        const csrData = { ...req.body, country_code: 'ID' };
        const csrResponse = await domainService.generateCsr(csrData);

        res.render('ssl/confirm-ssl-order', {
            user: user, // Kirim data user lengkap untuk pre-fill
            product,
            csr: csrResponse.data,
            title: 'Konfirmasi Pesanan SSL'
        });
    } catch (error) {
        req.flash('error_msg', `Gagal membuat CSR: ${error.message}`);
        res.redirect(`/ssl/order/${req.params.productId}`);
    }
};

// Aksi 2: Proses pesanan akhir
exports.processSslOrder = async (req, res) => {
    try {
        const { csr_code, dcv_method } = req.body;
        const user = await User.findById(req.session.user.id);
        
        const contactDetails = {
            firstname: user.name.split(' ')[0],
            lastname: user.name.split(' ').slice(1).join(' ') || user.name.split(' ')[0],
            organization: user.organization || user.name,
            address: user.street_1,
            phone: user.voice,
            title: 'Administrator',
            email: user.email,
            city: user.city,
            country: user.country_code,
            postal_code: user.postal_code,
        };
        
        const orderData = {
            ssl_product_id: req.params.productId,
            customer_id: user.customerId,
            dcv_method,
            period: 12,
            csr_code,
            admin_firstname: contactDetails.firstname,
            admin_lastname: contactDetails.lastname,
            admin_organization: contactDetails.organization,
            admin_address: contactDetails.address,
            admin_phone: contactDetails.phone,
            admin_title: contactDetails.title,
            admin_email: contactDetails.email,
            admin_city: contactDetails.city,
            admin_country: contactDetails.country,
            admin_postal_code: contactDetails.postal_code,
            tech_firstname: contactDetails.firstname,
            tech_lastname: contactDetails.lastname,
            tech_organization: contactDetails.organization,
            tech_address: contactDetails.address,
            tech_phone: contactDetails.phone,
            tech_title: contactDetails.title,
            tech_email: contactDetails.email,
            tech_city: contactDetails.city,
            tech_country: contactDetails.country,
            tech_postal_code: contactDetails.postal_code,
        };

        await domainService.orderSsl(orderData);
        
        req.flash('success_msg', 'Pesanan SSL Anda telah berhasil dibuat dan sedang diproses.');
        res.redirect('/dashboard');

    } catch (error) {
        req.flash('error_msg', `Gagal memproses pesanan SSL: ${error.message}`);
        res.redirect(`/ssl/order/${req.params.productId}`);
    }
};