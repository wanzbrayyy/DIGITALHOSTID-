exports.isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).send('Akses Ditolak: Anda bukan admin.');
        // Atau bisa juga redirect ke halaman lain: res.redirect('/dashboard');
    }
};