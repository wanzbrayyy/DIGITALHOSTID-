const domainService = require('../services/domainService');
const Product = require('../models/product');
const Promo = require('../models/promo');
const Setting = require('../models/setting');
const SystemService = require('../models/systemService');
const FreeDomainRequest = require('../models/freeDomainRequest');
const axios = require('axios');

exports.getHomePage = async (req, res) => {
    try {
        const products = await Product.find({ isFeatured: true });
        const promo = await Promo.findOne({ isActive: true });
        res.render('index', { 
            user: req.session.user, 
            products,
            promo,
            title: 'Domain, Hosting, & SSL Murah',
            description: 'DigitalHostID adalah penyedia layanan daftar domain, hosting cepat, dan sertifikat SSL terpercaya di Indonesia.',
            keywords: 'domain, hosting, ssl, web hosting, domain murah, hosting indonesia',
            canonicalUrl: process.env.APP_BASE_URL + '/'
        });
    } catch (error) {
        res.render('index', { user: req.session.user, products: [], promo: null, title: 'Error' });
    }
};

exports.checkDomain = async (req, res) => {
    const { keyword } = req.body;
    const tlds = ['.com', '.id', '.co.id', '.net', '.org', '.info', '.xyz', '.site'];
    if (!keyword) return res.status(400).json([]);
    
    const domainsToCheck = [];
    if (!keyword.includes('.')) tlds.forEach(tld => domainsToCheck.push(keyword + tld));
    else domainsToCheck.push(keyword);
    
    try {
        const checks = domainsToCheck.map(domain => domainService.checkDomainAvailability(domain));
        const results = await Promise.all(checks);
        return res.json(results);
    } catch (error) {
        return res.status(500).json([]);
    }
};

exports.orderDomain = async (req, res) => {
    const { domain } = req.query;
    if (!domain) {
        req.flash('error_msg', 'Nama domain tidak valid.');
        return res.redirect('/');
    }
    
    try {
        let settings = await Setting.findOne();
        if (!settings) settings = await new Setting().save();
        const tld = domain.split('.').pop();
        const price = settings.prices.tld.get(tld) || 150000;

        req.session.cart = {
            type: 'domain',
            item: { domain: domain, price: price },
            options: { period: 1, buy_whois_protection: false }
        };

        if (!req.session.user) return res.redirect('/register');
        res.redirect('/checkout');
    } catch (error) {
        req.flash('error_msg', 'Gagal memproses pesanan domain.');
        res.redirect('/');
    }
};

exports.getSslPage = async (req, res) => {
    try {
        const sslApiResponse = await domainService.listSslProductsWithPrices();
        if (!sslApiResponse || !sslApiResponse.data) throw new Error("Respon API tidak valid.");
        const settings = await Setting.findOne() || new Setting();
        const sslPriceOverrides = settings.prices.ssl;
        const sslProducts = sslApiResponse.data.map(p => ({
            ...p,
            original_price: p.price.sells.annually || 0,
            price: sslPriceOverrides.get(p.name) || p.price.sells.annually || 0,
            has_override: !!sslPriceOverrides.get(p.name)
        }));
        
        res.render('ssl', {
            user: req.session.user,
            sslProducts,
            title: 'Beli Sertifikat SSL Murah',
            description: 'Amankan website Anda dengan sertifikat SSL dari brand terpercaya.',
            canonicalUrl: process.env.APP_BASE_URL + '/ssl'
        });
    } catch (error) {
        req.flash('error_msg', `Gagal memuat produk SSL: ${error.message}`);
        res.render('ssl', { user: req.session.user, sslProducts: [] });
    }
};

exports.checkServerIp = async (req, res) => {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        res.status(200).json({
            message: "This is your server's IP Address.",
            ipAddress: response.data.ip
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to get server IP." });
    }
};

exports.getSystemStatusPage = async (req, res) => {
    try {
        const services = await SystemService.find().sort({ createdAt: 1 });
        res.render('system-status', {
            title: 'Status Sistem',
            description: 'Lihat status operasional real-time dari semua layanan DigitalHostID.',
            services,
            user: req.session.user,
            canonicalUrl: process.env.APP_BASE_URL + '/system-status'
        });
    } catch (error) {
        res.render('system-status', { title: 'Status Sistem', services: [], user: req.session.user });
    }
};

exports.getFreeDomainPage = (req, res) => {
    res.render('free-domain-request', {
        title: 'Permintaan Domain Gratis',
        description: 'Ajukan permintaan untuk mendapatkan domain gratis untuk proyek non-profit atau pendidikan Anda.',
        user: req.session.user,
        canonicalUrl: process.env.APP_BASE_URL + '/free-domain-request'
    });
};

exports.postFreeDomainRequest = async (req, res) => {
    try {
        await FreeDomainRequest.create(req.body);
        req.flash('success_msg', 'Permintaan Anda telah terkirim dan akan kami tinjau.');
        res.redirect('/');
    } catch (error) {
        req.flash('error_msg', 'Gagal mengirim permintaan.');
        res.redirect('/free-domain-request');
    }
};

exports.getAboutPage = (req, res) => res.render('about-us', {
    title: 'Tentang Kami',
    description: 'Pelajari lebih lanjut tentang misi dan visi DigitalHostID.',
    user: req.session.user,
    canonicalUrl: process.env.APP_BASE_URL + '/about-us'
});
exports.getPolicyPage = (req, res) => res.render('privacy-policy', {
    title: 'Kebijakan Privasi',
    description: 'Baca kebijakan privasi kami untuk memahami bagaimana kami melindungi data Anda.',
    user: req.session.user,
    canonicalUrl: process.env.APP_BASE_URL + '/privacy-policy'
});