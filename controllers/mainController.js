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
        
        const priceData = await domainService.listAllDomainPrices({ promo: true, limit: 6 });
        
        const settings = await Setting.findOne() || new Setting();
        const tldPriceOverrides = settings.prices.tld;

        const domainPrices = priceData.data
            // **PERBAIKAN YANG SAMA DITERAPKAN DI SINI**
            .filter(item => item && item.domain_extension && item.registration)
            .map(item => {
                const extensionWithDot = item.domain_extension.extension;
                const safeTldKey = extensionWithDot.substring(1).replace(/\./g, '_');
            
                const overridePrice = tldPriceOverrides.get(safeTldKey);
                const apiPromoPrice = item.promo_registration.registration['1'];
                const apiNormalPrice = item.registration['1'];
            
                let displayPrice = apiNormalPrice;
                if (apiPromoPrice) {
                    displayPrice = apiPromoPrice;
                }
                if (overridePrice) {
                    displayPrice = overridePrice;
                }

                return {
                    extension: item.domain_extension.extension,
                    price: parseInt(displayPrice),
                    originalPrice: parseInt(apiNormalPrice),
                    hasPromo: !!apiPromoPrice || (overridePrice && overridePrice < apiNormalPrice)
                };
            });

        res.render('index', { 
            user: req.session.user, 
            products,
            promo,
            domainPrices,
            title: 'Domain, Hosting, & SSL Murah',
            description: 'DigitalHostID adalah penyedia layanan registrasi domain, hosting cepat, dan sertifikat SSL terpercaya di Indonesia.',
            keywords: 'domain, hosting, ssl, web hosting, domain murah, hosting indonesia',
            canonicalUrl: process.env.APP_BASE_URL + '/'
        });
    } catch (error) {
        console.error("ERROR di getHomePage:", error);
        res.render('index', { 
            user: req.session.user, 
            products: [], 
            promo: null, 
            domainPrices: []
        });
    }
};

exports.getDomainPricingPage = async (req, res) => {
    try {
        const { page } = req.query;
        const apiParams = { page: page || 1, limit: 10 };
        
        const priceData = await domainService.listAllDomainPrices(apiParams);
        const settings = await Setting.findOne() || new Setting();
        const tldPriceOverrides = settings.prices.tld;

        const processedPrices = priceData.data
            .filter(item => 
                item && 
                item.registration && 
                item.registration['1'] && 
                item.renewal && 
                item.renewal['1'] &&
                item.domain_extension
            )
            .map(item => {
                const extensionWithDot = item.domain_extension.extension;
                const safeTldKey = extensionWithDot.substring(1).replace(/\./g, '_');
                const overridePrice = tldPriceOverrides.get(safeTldKey);
                
                // **PERBAIKAN UTAMA ADA DI SINI**
                // Cek keberadaan promo_registration sebelum mengaksesnya
                const apiPromoPrice = (item.promo_registration && item.promo_registration.registration) 
                                      ? item.promo_registration.registration['1'] 
                                      : null;

                const apiNormalPrice = item.registration['1'];

                let finalRegPrice = apiNormalPrice;
                if (apiPromoPrice) finalRegPrice = apiPromoPrice;
                if (overridePrice) finalRegPrice = overridePrice;

                return {
                    ...item,
                    final_registration_price: parseInt(finalRegPrice),
                    has_promo_or_override: !!apiPromoPrice || (overridePrice && overridePrice < parseInt(apiNormalPrice))
                };
            });

        res.render('domain-pricing', {
            user: req.session.user,
            prices: processedPrices,
            pagination: priceData.meta,
            title: 'Harga Domain',
            description: 'Lihat daftar harga registrasi, perpanjangan, dan transfer domain TLD terlengkap.',
            canonicalUrl: process.env.APP_BASE_URL + '/domain-pricing'
        });
    } catch (error) {
        console.error("ERROR di getDomainPricingPage:", error);
        req.flash('error_msg', `Gagal memuat daftar harga: ${error.message}`);
        res.render('domain-pricing', {
            user: req.session.user,
            prices: [],
            pagination: null,
            title: 'Harga Domain'
        });
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

        const sslProducts = sslApiResponse.data.map(item => {
            const productInfo = item.product;
            const overridePrice = sslPriceOverrides.get(productInfo.name);
            const originalPrice = parseFloat(item['1']);

            // **PERBAIKAN: Buat struktur yang jelas dan tidak tumpang tindih**
            return {
                productId: productInfo.id, // ID Produk (misal: 1, 2)
                priceId: item.id,         // ID Harga (misal: 2919, 2920)
                name: productInfo.name,
                brand: productInfo.brand,
                ssl_type: productInfo.ssl_type,
                is_wildcard: productInfo.is_wildcard,
                features: productInfo.features,
                original_price: originalPrice,
                price: overridePrice || originalPrice,
                has_override: !!overridePrice
            };
        });
        
        res.render('ssl', {
            user: req.session.user,
            sslProducts,
            title: 'Beli Sertifikat SSL Murah'
        });
    } catch (error) {
        console.error("GAGAL MEMUAT SSL:", error); 
        req.flash('error_msg', `Gagal memuat produk SSL: ${error.message}`);
        res.render('ssl', { user: req.session.user, sslProducts: [], title: 'Beli Sertifikat SSL' });
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