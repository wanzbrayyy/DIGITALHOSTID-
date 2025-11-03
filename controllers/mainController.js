const domainService = require('../services/domainService');
const Product = require('../models/product');
const Promo = require('../models/promo');
const Setting = require('../models/setting');

exports.getHomePage = async (req, res) => {
    try {
        const products = await Product.find({ isFeatured: true });
        const promo = await Promo.findOne({ isActive: true });
        res.render('index', { 
            user: req.session.user, 
            products,
            promo,
            title: 'Penyedia Domain & Hosting Terpercaya' 
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
            throw new Error("Respon API tidak valid atau tidak berisi data produk.");
        }

        const settings = await Setting.findOne() || new Setting();
        const sslPriceOverrides = settings.prices.ssl;

        const sslProducts = sslApiResponse.data
            .filter(product => product && product.name && product.price && product.price.sells)
            .map(product => {
                const overridePrice = sslPriceOverrides.get(product.name);
                const originalPrice = product.price.sells.annually || 0;

                return {
                    ...product,
                    original_price: originalPrice,
                    price: overridePrice || originalPrice,
                    has_override: !!overridePrice
                };
            });
        
        res.render('ssl', {
            user: req.session.user,
            sslProducts,
            title: 'Beli Sertifikat SSL'
        });
    } catch (error) {
        // **INI BAGIAN PALING PENTING UNTUK DEBUGGING**
        console.error("GAGAL MEMUAT SSL:", error); 
        
        req.flash('error_msg', `Gagal memuat produk SSL: ${error.message}`);
        res.render('ssl', { user: req.session.user, sslProducts: [], title: 'Beli Sertifikat SSL' });
    }
};