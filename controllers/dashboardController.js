const domainService = require('../services/domainService');
const User = require('../models/user');

exports.getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) {
            return req.session.destroy(() => {
                res.redirect('/login');
            });
        }

        const domainsResponse = await domainService.listDomains({ customer_id: user.customerId });
        
        res.render('dashboard/index', {
            user: user, 
            domains: domainsResponse.data || [],
            title: 'Dashboard'
        });
    } catch (error) {
        req.flash('error_msg', `Gagal memuat data domain: ${error.message}`);
        res.render('dashboard/index', { 
            user: req.session.user, 
            domains: [], 
            title: 'Dashboard' 
        });
    }
};

exports.getBuyDomainPage = (req, res) => {
    res.render('dashboard/buy-domain', { user: req.session.user, title: 'Beli Domain Baru' });
};

exports.getTransferDomainPage = (req, res) => {
    res.render('dashboard/transfer-domain', { user: req.session.user, title: 'Transfer Domain' });
};

exports.postTransferDomain = async (req, res) => {
    const { name, auth_code } = req.body;
    try {
        const user = await User.findById(req.session.user.id);
        await domainService.transferDomain({ name, auth_code, customer_id: user.customerId });
        req.flash('success_msg', `Permintaan transfer untuk domain ${name} berhasil dikirim.`);
        res.redirect('/dashboard');
    } catch (error) {
        req.flash('error_msg', `Transfer domain gagal: ${error.message}`);
        res.redirect('/dashboard/transfer-domain');
    }
};

exports.getManageDomainPage = async (req, res) => {
    try {
        const response = await domainService.showDomainById(req.params.id);
        res.render('dashboard/manage-domain', { user: req.session.user, domain: response.data, title: 'Kelola Domain' });
    } catch (error) {
        req.flash('error_msg', `Gagal mengambil detail domain: ${error.message}`);
        res.redirect('/dashboard');
    }
};

exports.toggleLock = async (req, res) => {
    try {
        const domain = await domainService.showDomainById(req.params.id);
        if (domain.data.is_locked) {
            await domainService.unlockDomain(req.params.id);
            req.flash('success_msg', 'Domain berhasil di-unlock.');
        } else {
            await domainService.lockDomain(req.params.id, 'User requested lock');
            req.flash('success_msg', 'Domain berhasil di-lock.');
        }
    } catch (error) {
        req.flash('error_msg', `Gagal mengubah status lock: ${error.message}`);
    }
    res.redirect(`/dashboard/domain/${req.params.id}/manage`);
};

exports.resendVerification = async (req, res) => {
    try {
        await domainService.resendVerificationEmail(req.params.id);
        req.flash('success_msg', 'Email verifikasi berhasil dikirim ulang.');
    } catch (error) {
        req.flash('error_msg', `Gagal mengirim ulang email: ${error.message}`);
    }
    res.redirect(`/dashboard/domain/${req.params.id}/manage`);
};

exports.getDnsManagerPage = async (req, res) => {
    try {
        const domain = await domainService.showDomainById(req.params.id);
        const recordsResponse = await domainService.getDnsRecords(req.params.id);
        res.render('dashboard/manage-dns', {
            user: req.session.user,
            domainName: domain.data.name,
            domainId: req.params.id,
            records: recordsResponse.data || [],
            title: 'DNS Manager'
        });
    } catch (error) {
        req.flash('error_msg', `Gagal memuat DNS Manager: ${error.message}`);
        res.redirect(`/dashboard/domain/${req.params.id}/manage`);
    }
};

exports.createDnsRecord = async (req, res) => {
    const { type, name, content, ttl } = req.body;
    try {
        await domainService.createDnsRecord(req.params.id, { type, name, content, ttl: parseInt(ttl) });
        req.flash('success_msg', 'DNS record berhasil ditambahkan.');
    } catch (error) {
        req.flash('error_msg', `Gagal menambah record: ${error.message}`);
    }
    res.redirect(`/dashboard/domain/${req.params.id}/dns`);
};

exports.deleteDnsRecord = async (req, res) => {
    const { type, name, content } = req.body;
    try {
        await domainService.deleteDnsRecord(req.params.id, { type, name, content });
        req.flash('success_msg', 'DNS record berhasil dihapus.');
    } catch (error) {
        req.flash('error_msg', `Gagal menghapus record: ${error.message}`);
    }
    res.redirect(`/dashboard/domain/${req.params.id}/dns`);
};

exports.getSettingsPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('dashboard/settings', { user, title: 'Pengaturan Akun' });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat pengaturan.');
        res.redirect('/dashboard');
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const updatedData = { ...req.body };

        if (req.file) {
            updatedData.profilePicture = req.file.path;
        }

        await User.findByIdAndUpdate(req.session.user.id, updatedData);
        await domainService.updateCustomer(user.customerId, updatedData);
        
        req.session.user.name = updatedData.name;
        req.session.user.email = updatedData.email;
        if (req.file) {
            req.session.user.profilePicture = updatedData.profilePicture;
        }

        req.session.save((err) => {
            if (err) {
                req.flash('error_msg', 'Gagal menyimpan sesi setelah update.');
                return res.redirect('/dashboard/settings');
            }
            req.flash('success_msg', 'Pengaturan berhasil diperbarui.');
            res.redirect('/dashboard/settings');
        });

    } catch (error) {
        req.flash('error_msg', `Gagal memperbarui pengaturan: ${error.message}`);
        res.redirect('/dashboard/settings');
    }
};


exports.getRenewPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('dashboard/renew', {
            user: user,
            title: 'Perpanjang Layanan'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat halaman perpanjangan.');
        res.redirect('/dashboard');
    }
};