const Service = require('../models/service');

exports.getMyServicesPage = async (req, res) => {
    try {
        const services = await Service.find({ user: req.session.user.id }).sort({ nextDueDate: 1 });

        res.render('dashboard/my-services', {
            user: req.session.user,
            services,
            title: 'Layanan Saya'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat daftar layanan Anda.');
        res.render('dashboard/my-services', {
            user: req.session.user,
            services: [],
            title: 'Layanan Saya'
        });
    }
};