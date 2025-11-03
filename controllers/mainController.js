const domainService = require('../services/domainService');
const Product = require('../models/product');
const Promo = require('../models/promo');
const Setting = require('../models/setting');
const os = require('os');

exports.getHomePage = async (req, res) => {
    try {
        const products = await Product.find({ isFeatured: true });
        const promo = await Promo.findOne({ isActive: true });
        res.render('index', { 
            user: req.session.user, 
            products,
            promo,
            title: 'domain, hosting, & ssl murah',
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

exports.checkIp = (req, res) => {
    const networkInterfaces = os.networkInterfaces();
    const ips = {};
    for (const name of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                if (!ips[name]) {
                    ips[name] = [];
                }
                ips[name].push(net.address);
            }
        }
    }
    res.json({ local_ips: ips });
};

exports.getRobotsTxt = (req, res) => {
    res.type('text/plain');
    const content = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /support
Disallow: /dashboard

Sitemap: ${process.env.APP_BASE_URL}/sitemap.xml`;
    res.send(content);
};

exports.getSitemapXml = async (req, res) => {
    res.type('application/xml');
    let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    
    const staticPages = ['/', '/ssl', '/login', '/register'];
    staticPages.forEach(page => {
        xml += `<url><loc>${process.env.APP_BASE_URL}${page}</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><priority>0.8</priority></url>`;
    });

    xml += '</urlset>';
    res.send(xml);
};