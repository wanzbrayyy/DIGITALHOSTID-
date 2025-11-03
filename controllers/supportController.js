const Ticket = require('../models/ticket');

exports.getSupportDashboard = async (req, res) => {
    try {
        const tickets = await Ticket.find({ status: { $ne: 'Ditutup' } })
            .populate('user', 'name')
            .sort({ assignedTo: req.session.user.id === 'assignedTo' ? -1 : 1, updatedAt: -1 });

        res.render('support/index', {
            user: req.session.user,
            tickets,
            title: 'Support Dashboard'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat dashboard support.');
        res.redirect('/login');
    }
};