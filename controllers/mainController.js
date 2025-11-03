const domainService = require('../services/domainService');
const Product = require('../models/product');
const Promo = require('../models/promo');
const Setting = require('../models/setting');
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
            description: 'DigitalHostID adalah penyedia layanan daftar domain, hosting cepat, dan sertifikat ssl terpercaya di Indonesia untuk semua kebutuhan online Anda.',
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
    if (!keyword) return res.status(400).json([{ error: true, message: 'Keyword tidak boleh kosong.' }]);
    
    const domainsToCheck = [];
    if (!keyword.includes('.')) tlds.forEach(tld => domainsToCheck.push(keyword + tld));
    else domainsToCheck.push(keyword);
    
    try {
        const checks = domainsToCheck.map(domain => domainService.checkDomainAvailability(domain));
        const results = await Promise.all(checks);
        return res.json(results);
    } catch (error) {
        return res.status(500).json([{ name: keyword, error: true, message: 'Gagal memeriksa domain.' }]);
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
        if (!settings) {
            settings = new Setting();
            await settings.save();
        }
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
        console.error("ERROR di orderDomain:", error); 
        req.flash('error_msg', 'Gagal memproses pesanan domain.');
        res.redirect('/');
    }
};

exports.getSslPage = async (req, res) => {
    try {
        const sslApiResponse = await domainService.listSslProductsWithPrices();
        if (!sslApiResponse || !sslApiResponse.data || !Array.isArray(sslApiResponse.data)) {
            throw new Error("Respon API tidak valid.");
        }
        const settings = await Setting.findOne() || new Setting();
        const sslPriceOverrides = settings.prices.ssl;
        const sslProducts = sslApiResponse.data
            .filter(p => p && p.name && p.price && p.price.sells)
            .map(p => ({
                ...p,
                original_price: p.price.sells.annually || 0,
                price: sslPriceOverrides.get(p.name) || p.price.sells.annually || 0,
                has_override: !!sslPriceOverrides.get(p.name)
            }));
        
        res.render('ssl', {
            user: req.session.user,
            sslProducts,
            title: 'Beli Sertifikat SSL Murah',
            description: 'Amankan website Anda dengan sertifikat SSL dari brand terpercaya. Tingkatkan kepercayaan pengunjung dan peringkat SEO.',
            keywords: 'beli ssl, sertifikat ssl, ssl murah, sectigo ssl, enkripsi website',
            canonicalUrl: process.env.APP_BASE_URL + '/ssl'
        });
    } catch (error) {
        console.error("GAGAL MEMUAT SSL:", error); 
        req.flash('error_msg', `Gagal memuat produk SSL: ${error.message}`);
        res.render('ssl', { user: req.session.user, sslProducts: [], title: 'Beli Sertifikat SSL' });
    }
};

// **FUNGSI BARU ANDA YANG SUDAH DIIMPLEMENTASIKAN**
exports.checkServerIp = async (req, res) => {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        res.status(200).json({
            message: "This is your server's IP Address. Add this IP to your API provider's whitelist.",
            ipAddress: response.data.ip
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to get server IP.", details: error.message });
    }
};