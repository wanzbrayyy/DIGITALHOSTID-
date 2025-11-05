
const domainService = require('../services/domainService');
const User = require('../models/user');
const crypto = require('crypto');
exports.getDashboard = async (req, res) => {
    try {
        // **PERBAIKAN: Cek query parameter dan buat flash message**
        if (req.query.registration === 'processing') {
            req.flash('success_msg', 'Pendaftaran domain berhasil! Status akan menjadi "Aktif" dalam beberapa menit setelah proses registrasi di registrar selesai.');
        }

        const user = await User.findById(req.session.user.id);
        if (!user) {
            return req.session.destroy(() => { res.redirect('/login'); });
        }

        const { page, status, name } = req.query;

        const apiParams = {
            customer_id: user.customerId,
            page: page || 1,
            limit: 10,
            'f_params[orderBy][field]': 'id', 
            'f_params[orderBy][type]': 'desc'
        };

        if (status) apiParams.status = status;
        if (name) apiParams.name = name;
        
        const domainsResponse = await domainService.listDomains(apiParams);
        
        res.render('dashboard/index', {
            user: user, 
            domains: domainsResponse.data || [],
            pagination: domainsResponse.meta,
            filters: { status, name },
            title: 'Dashboard'
        });
    } catch (error) {
        console.error("ERROR di getDashboard:", error);
        req.flash('error_msg', `Gagal memuat data domain. Provider API mungkin sedang mengalami masalah.`);
        
        res.render('dashboard/index', { 
            user: req.session.user, 
            domains: [], 
            pagination: null,
            filters: {},      
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

exports.getManageDomainPage = async (req, res) => {
    try {
        const response = await domainService.showDomainById(req.params.id);
        res.render('dashboard/manage-domain', { 
            user: req.session.user, 
            domain: response.data, 
            title: `Kelola Domain: ${response.data.name}`
        });
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


exports.updateNameservers = async (req, res) => {
    const domainId = req.params.id;
    try {
        const dataToUpdate = {};
        if (req.body.ns1) dataToUpdate['nameserver[0]'] = req.body.ns1.trim();
        if (req.body.ns2) dataToUpdate['nameserver[1]'] = req.body.ns2.trim();
        if (req.body.ns3) dataToUpdate['nameserver[2]'] = req.body.ns3.trim();
        if (req.body.ns4) dataToUpdate['nameserver[3]'] = req.body.ns4.trim();
        if (Object.keys(dataToUpdate).length < 2) throw new Error('Minimal 2 nameserver diperlukan.');
        await domainService.updateNameserver(domainId, dataToUpdate);
        await new Promise(resolve => setTimeout(resolve, 2000));
        req.flash('success_msg', 'Permintaan update nameserver berhasil dikirim.');
    } catch (error) {
        req.flash('error_msg', `Gagal memperbarui nameserver: ${error.message}`);
    }
    res.redirect(`/dashboard/domain/${domainId}/manage`);
};

exports.getAuthCode = async (req, res) => {
    const domainId = req.params.id;
    try {
        const response = await domainService.getDomainAuthCode(domainId);
        // **PERBAIKAN UTAMA: Akses properti yang benar**
        const authCode = response.data.auth_code;
        if (!authCode) throw new Error("API tidak mengembalikan Auth Code.");
        req.flash('success_msg', `Kode EPP/Auth Code Anda adalah: ${authCode}`);
    } catch (error) {
        req.flash('error_msg', `Gagal mendapatkan Auth Code: ${error.message}`);
    }
    res.redirect(`/dashboard/domain/${domainId}/manage`);
};

exports.resetAuthCode = async (req, res) => {
    const domainId = req.params.id;
    try {
        // Buat kode acak yang kuat sesuai persyaratan API
        const newAuthCode = `${crypto.randomBytes(4).toString('hex')}1a`;
        await domainService.resetDomainAuthCode(domainId, newAuthCode);
        req.flash('success_msg', `Kode EPP/Auth Code berhasil direset. Kode baru Anda adalah: ${newAuthCode}`);
    } catch (error) {
        req.flash('error_msg', `Gagal mereset Auth Code: ${error.message}`);
    }
    res.redirect(`/dashboard/domain/${domainId}/manage`);
};

exports.lookupWhois = async (req, res) => {
    try {
        const response = await domainService.getDomainWhois(req.query.domain);
        res.render('dashboard/whois-result', {
            user: req.session.user,
            domainName: req.query.domain,
            whoisData: response,
            title: `WHOIS: ${req.query.domain}`
        });
    } catch (error) {
        req.flash('error_msg', `Gagal melakukan WHOIS lookup: ${error.message}`);
        res.redirect(`/dashboard`);
    }
};