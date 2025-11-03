const Ticket = require('../models/ticket');
const User = require('../models/user');

exports.getTicketsPage = async (req, res) => {
    try {
        const tickets = await Ticket.find({ user: req.session.user.id }).sort({ updatedAt: -1 });
        res.render('dashboard/tickets', {
            user: req.session.user,
            tickets,
            title: 'Tiket Bantuan'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat tiket.');
        res.render('dashboard/tickets', {
            user: req.session.user,
            tickets: [],
            title: 'Tiket Bantuan'
        });
    }
};

exports.getNewTicketPage = (req, res) => {
    res.render('dashboard/new-ticket', {
        user: req.session.user,
        title: 'Buat Tiket Baru'
    });
};

exports.createTicket = async (req, res) => {
    const { subject, department, message } = req.body;
    if (!subject || !department || !message) {
        req.flash('error_msg', 'Harap isi semua kolom.');
        return res.redirect('/dashboard/tickets/new');
    }

    try {
        const initialMessage = {
            sender: req.session.user.id,
            message: message
        };
        if (req.file) {
            initialMessage.imageUrl = req.file.path; 
        }

        const newTicket = new Ticket({
            user: req.session.user.id,
            subject,
            department,
            messages: [initialMessage] 
        });

        await newTicket.save();
        req.flash('success_msg', 'Tiket berhasil dibuat. Tim kami akan segera merespon.');
        res.redirect(`/dashboard/tickets/${newTicket._id}`);
    } catch (error) {
        req.flash('error_msg', 'Terjadi kesalahan saat membuat tiket.');
        res.redirect('/dashboard/tickets/new');
    }
};

exports.viewTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate('user')
            .populate('messages.sender')
            .populate('assignedTo', 'name');

        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            const redirectUrl = req.originalUrl.startsWith('/support') ? '/support' : (req.originalUrl.startsWith('/admin') ? '/admin' : '/dashboard/tickets');
            return res.redirect(redirectUrl);
        }

        const isOwner = ticket.user._id.toString() === req.session.user.id.toString();
        const isSupportOrAdmin = req.session.user.role === 'admin' || req.session.user.role === 'support';
        
        if (!isOwner && !isSupportOrAdmin) {
            req.flash('error_msg', 'Anda tidak diizinkan melihat tiket ini.');
            return res.redirect('/dashboard');
        }

        if (isSupportOrAdmin && !ticket.assignedTo) {
            ticket.assignedTo = req.session.user.id;
            await ticket.save();
        }

        let view;
        if (req.originalUrl.startsWith('/support')) {
            view = 'support/view-ticket';
        } else if (req.originalUrl.startsWith('/admin')) {
            view = 'admin/view-ticket';
        } else {
            view = 'dashboard/view-ticket';
        }
        
        res.render(view, {
            user: req.session.user,
            ticket,
            title: `Tiket: ${ticket.subject}`
        });

    } catch (error) {
        console.error("Error di viewTicket:", error);
        req.flash('error_msg', 'Gagal memuat tiket.');
        const redirectUrl = req.originalUrl.startsWith('/support') ? '/support' : (req.originalUrl.startsWith('/admin') ? '/admin' : '/dashboard/tickets');
        res.redirect(redirectUrl);
    }
};

exports.replyTicket = async (req, res) => {
    const { message } = req.body;
    const ticketId = req.params.id;
    let redirectUrl = req.originalUrl.includes('/admin/') ? `/admin/tickets/${ticketId}` : `/dashboard/tickets/${ticketId}`;
    if (req.originalUrl.includes('/support/')) {
        redirectUrl = `/support/tickets/${ticketId}`;
    }

    if (!message) {
        req.flash('error_msg', 'Balasan tidak boleh kosong.');
        return res.redirect(redirectUrl);
    }
    
    try {
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect(redirectUrl.replace(`/${ticketId}`, ''));
        }
        
        ticket.messages.push({ sender: req.session.user.id, message });
        
        if (req.session.user.role === 'admin' || req.session.user.role === 'support') {
            ticket.status = 'Dijawab';
        } else {
            ticket.status = 'Buka';
        }

        await ticket.save();
        req.flash('success_msg', 'Balasan berhasil dikirim.');
        res.redirect(redirectUrl);

    } catch (error) {
        req.flash('error_msg', 'Terjadi kesalahan saat mengirim balasan.');
        res.redirect(redirectUrl);
    }
};

exports.adminGetTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find().populate('user', 'name').sort({ updatedAt: -1 });
        res.render('admin/tickets', {
            user: req.session.user,
            tickets,
            title: 'Manajemen Tiket'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat daftar tiket.');
        res.redirect('/admin');
    }
};

exports.adminCloseTicket = async (req, res) => {
    const ticketId = req.params.id;
    let redirectUrl = req.originalUrl.includes('/admin/') ? `/admin/tickets/${ticketId}` : `/support/tickets/${ticketId}`;
    try {
        await Ticket.findByIdAndUpdate(ticketId, { status: 'Ditutup' });
        req.flash('success_msg', 'Tiket telah ditutup.');
        res.redirect(redirectUrl);
    } catch (error) {
        req.flash('error_msg', 'Gagal menutup tiket.');
        res.redirect(redirectUrl);
    }
};