module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.session.user) {
            return next();
        }
        req.flash('error_msg', 'Silakan login terlebih dahulu untuk mengakses halaman ini.');
        res.redirect('/login');
    },

    forwardAuthenticated: function(req, res, next) {
        if (!req.session.user) {
            return next();
        }
        res.redirect('/dashboard');
    },

    isAdmin: function(req, res, next) {
        if (req.session.user && req.session.user.role === 'admin') {
            return next();
        }
        req.flash('error_msg', 'Anda tidak memiliki akses ke halaman ini.');
        res.redirect('/dashboard');
    },
    
    isSupportOrAdmin: function(req, res, next) {
        if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'support')) {
            return next();
        }
        req.flash('error_msg', 'Anda tidak memiliki akses ke halaman ini.');
        res.redirect('/dashboard');
    }
};