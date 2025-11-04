const domainService = require('../services/domainService');
const User = require('../models/user');
const Product = require('../models/product');
const Voucher = require('../models/voucher');
const Promo = require('../models/promo');
const Notification = require('../models/notification');
const Setting = require('../models/setting');
const FreeDomainRequest = require('../models/freeDomainRequest');
const SystemService = require('../models/systemService');

exports.getAdminDashboard = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const domainsResponse = await domainService.listDomains({ limit: 1 });
        const domainCount = domainsResponse.meta.total;

        res.render('admin/index', {
            user: req.session.user,
            userCount,
            domainCount,
            title: 'Admin Dashboard'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat data dashboard admin.');
        res.render('admin/index', { 
            user: req.session.user, 
            userCount: 'N/A', 
            domainCount: 'N/A', 
            title: 'Admin Dashboard' 
        });
    }
};

exports.getDomainsPage = async (req, res) => {
    try {
        const response = await domainService.listDomains({ limit: 100 });
        res.render('admin/domains', {
            user: req.session.user,
            domains: response.data,
            title: 'Manajemen Domain'
        });
    } catch (error) {
        req.flash('error_msg', `Gagal mengambil daftar domain: ${error.message}`);
        res.redirect('/admin');
    }
};

exports.suspendDomain = async (req, res) => {
    try {
        await domainService.suspendDomain(req.params.id, req.body.reason);
        req.flash('success_msg', 'Domain berhasil di-suspend.');
    } catch (error) {
        req.flash('error_msg', `Gagal men-suspend domain: ${error.message}`);
    }
    res.redirect('/admin/domains');
};

exports.unsuspendDomain = async (req, res) => {
    try {
        await domainService.unsuspendDomain(req.params.id);
        req.flash('success_msg', 'Domain berhasil diaktifkan kembali.');
    } catch (error) {
        req.flash('error_msg', `Gagal mengaktifkan domain: ${error.message}`);
    }
    res.redirect('/admin/domains');
};

exports.getUsersPage = async (req, res) => {
    try {
        const users = await User.find().sort({ name: 1 });
        res.render('admin/users', {
            user: req.session.user,
            users,
            title: 'Manajemen Pengguna'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat daftar pengguna.');
        res.redirect('/admin');
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { role: req.body.role });
        req.flash('success_msg', 'Peran pengguna berhasil diperbarui.');
    } catch (error) {
        req.flash('error_msg', 'Gagal memperbarui peran pengguna.');
    }
    res.redirect('/admin/users');
};

exports.getNotificationsPage = async (req, res) => {
    try {
        const users = await User.find({}, 'name email');
        res.render('admin/notifications', {
            user: req.session.user,
            users,
            title: 'Kirim Notifikasi'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat halaman notifikasi.');
        res.redirect('/admin');
    }
};

exports.sendNotification = async (req, res) => {
    const { userId, title, message, link } = req.body;
    try {
        // PERBAIKAN: Petakan field secara eksplisit untuk menghindari masalah
        await Notification.create({
            user: userId,
            title,
            message,
            link
        });
        req.flash('success_msg', 'Notifikasi berhasil dikirim.');
    } catch (error) {
        req.flash('error_msg', 'Gagal mengirim notifikasi.');
    }
    res.redirect('/admin/notifications');
};
exports.getProductsPage = async (req, res) => {
    try {
        const products = await Product.find();
        res.render('admin/products', { user: req.session.user, products, title: 'Kelola Produk' });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat produk.');
        res.redirect('/admin');
    }
};

exports.createProduct = async (req, res) => {
    try {
        const { name, description, price, features, icon, isFeatured } = req.body;
        const newProduct = new Product({ name, description, price, icon, features: features.split(','), isFeatured: isFeatured === 'on' });
        await newProduct.save();
        req.flash('success_msg', 'Produk berhasil ditambahkan.');
    } catch (error) {
        req.flash('error_msg', 'Gagal menambah produk.');
    }
    res.redirect('/admin/products');
};

exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Produk berhasil dihapus.');
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus produk.');
    }
    res.redirect('/admin/products');
};

exports.getVouchersPage = async (req, res) => {
    try {
        const vouchers = await Voucher.find();
        res.render('admin/vouchers', { user: req.session.user, vouchers, title: 'Kelola Voucher' });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat voucher.');
        res.redirect('/admin');
    }
};

exports.createVoucher = async (req, res) => {
    try {
        await Voucher.create(req.body);
        req.flash('success_msg', 'Voucher berhasil dibuat.');
    } catch (error) {
        req.flash('error_msg', 'Gagal membuat voucher.');
    }
    res.redirect('/admin/vouchers');
};

exports.deleteVoucher = async (req, res) => {
    try {
        await Voucher.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Voucher berhasil dihapus.');
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus voucher.');
    }
    res.redirect('/admin/vouchers');
};

exports.getPromosPage = async (req, res) => {
    try {
        const promos = await Promo.find();
        res.render('admin/promos', { user: req.session.user, promos, title: 'Kelola Promo' });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat promo.');
        res.redirect('/admin');
    }
};

exports.createPromo = async (req, res) => {
    try {
        await Promo.create(req.body);
        req.flash('success_msg', 'Promo berhasil dibuat dan diaktifkan.');
    } catch (error) {
        req.flash('error_msg', 'Gagal membuat promo.');
    }
    res.redirect('/admin/promos');
};

exports.deletePromo = async (req, res) => {
    try {
        await Promo.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Promo berhasil dihapus.');
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus promo.');
    }
    res.redirect('/admin/promos');
};

exports.getSettingsHargaPage = async (req, res) => {
    try {
        let settings = await Setting.findOne();
        if (!settings) settings = await new Setting().save();
        
        const allDomainPricesResponse = await domainService.listAllDomainPrices({ limit: 100 });

        // **PERBAIKAN UTAMA: Saring dan proses data API sebelum dikirim ke view**
        const processedTldsFromApi = allDomainPricesResponse.data
            .filter(item => 
                item && 
                item.registration && 
                item.registration['1'] &&
                item.domain_extension
            )
            .map(item => {
                const promoPrice = (item.promo_registration && item.promo_registration.registration)
                                   ? item.promo_registration.registration['1']
                                   : null;
                const normalPrice = item.registration['1'];
                return {
                    tld: item.domain_extension.extension.substring(1), // Hasil: "co.id"
                    apiPrice: promoPrice || normalPrice
                };
            });

        const sslApiResponse = await domainService.listSslProductsWithPrices();

        const displayTldPrices = {};
        if (settings.prices.tld) {
            for (const [key, value] of settings.prices.tld.entries()) {
                displayTldPrices[key.replace(/_/g, '.')] = value;
            }
        }

        res.render('admin/settings-harga', {
            user: req.session.user,
            whoisPrice: settings.prices.whois,
            tldPrices: displayTldPrices,
            allTldsFromApi: processedTldsFromApi, // Kirim data yang sudah bersih
            sslPrices: Object.fromEntries(settings.prices.ssl || new Map()),
            sslApiProducts: sslApiResponse.data || [],
            title: 'Pengaturan Harga'
        });
    } catch (error) {
        req.flash('error_msg', `Gagal memuat pengaturan harga: ${error.message}`);
        res.redirect('/admin');
    }
};

exports.updateSettingsHarga = async (req, res) => {
    try {
        const { setting_type } = req.body;
        let settings = await Setting.findOne() || new Setting();

        // **PERBAIKAN "BRUTAL" DIMULAI DI SINI**

        // 1. Buat salinan dari objek prices yang ada
        const newPrices = {
            whois: settings.prices.whois,
            tld: new Map(settings.prices.tld),
            ssl: new Map(settings.prices.ssl)
        };

        switch (setting_type) {
            case 'whois':
                newPrices.whois = req.body.whois_price;
                break;
            
            case 'tld_bulk':
                if (req.body.tld_prices) {
                    const tldPricesFromForm = req.body.tld_prices;
                    for (const tld in tldPricesFromForm) {
                        const safeKey = tld.replace(/\./g, '_');
                        const price = tldPricesFromForm[tld];

                        if (price && price > 0) {
                            newPrices.tld.set(safeKey, parseInt(price));
                        } else {
                            newPrices.tld.delete(safeKey);
                        }
                    }
                }
                break;
            
            case 'ssl':
                if (req.body.ssl_prices) {
                    const filteredPrices = Object.entries(req.body.ssl_prices).filter(([_, value]) => value !== '');
                    newPrices.ssl = new Map(filteredPrices);
                }
                break;
        }
        
        // 2. GANTI SELURUH OBJEK 'prices' dengan yang baru
        settings.prices = newPrices;
        
        // 3. (Opsional tapi aman) Tandai path utama sebagai termodifikasi
        settings.markModified('prices');

        await settings.save();
        req.flash('success_msg', 'Pengaturan harga berhasil diperbarui.');

    } catch (error) {
        req.flash('error_msg', `Gagal memperbarui harga: ${error.message}`);
    }
    res.redirect('/admin/settings-harga');
};

exports.getFreeDomainRequests = async (req, res) => {
    try {
        const requests = await FreeDomainRequest.find().sort({ createdAt: -1 });
        res.render('admin/free-domain-requests', {
            user: req.session.user,
            requests,
            title: 'Permintaan Domain Gratis'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat permintaan domain.');
        res.redirect('/admin');
    }
};

exports.updateFreeDomainRequestStatus = async (req, res) => {
    try {
        const { requestId, status } = req.body;
        await FreeDomainRequest.findByIdAndUpdate(requestId, { status });
        req.flash('success_msg', 'Status permintaan berhasil diperbarui.');
        res.redirect('/admin/free-domain-requests');
    } catch (error) {
        req.flash('error_msg', 'Gagal memperbarui status.');
        res.redirect('/admin/free-domain-requests');
    }
};

exports.getSystemStatusManagement = async (req, res) => {
    try {
        const services = await SystemService.find();
        res.render('admin/manage-system-status', {
            user: req.session.user,
            services,
            title: 'Kelola Status Sistem'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat halaman status sistem.');
        res.redirect('/admin');
    }
};

exports.updateSystemStatus = async (req, res) => {
    try {
        const { serviceId, status, description } = req.body;
        if (!serviceId) { // Create new service
            await SystemService.create({ name: req.body.name, status, description });
            req.flash('success_msg', 'Layanan baru berhasil ditambahkan.');
        } else { // Update existing
            await SystemService.findByIdAndUpdate(serviceId, { status, description });
            req.flash('success_msg', 'Status layanan berhasil diperbarui.');
        }
        res.redirect('/admin/system-status');
    } catch (error) {
        req.flash('error_msg', 'Gagal memperbarui status sistem.');
        res.redirect('/admin/system-status');
    }
};