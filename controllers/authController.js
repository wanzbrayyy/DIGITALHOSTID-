const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user');
const domainService = require('../services/domainService');
const AffiliateReferral = require('../models/affiliatereferral');

exports.getLoginPage = (req, res) => {
    res.render('login', { title: 'Login' });
};

exports.getRegisterPage = (req, res) => {
    res.render('register', { title: 'Registrasi', plan: req.query.plan || '' });
};

exports.postLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('login', { error: 'Email atau password salah.', title: 'Login' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { error: 'Email atau password salah.', title: 'Login' });
        }

        req.session.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture,
            affiliateCode: user.affiliateCode
        };

        req.session.save((err) => {
            if (err) {
                return res.render('login', { error: 'Gagal menyimpan sesi, coba lagi.', title: 'Login' });
            }
            
            if (user.role === 'admin') {
                return res.redirect('/admin');
            } else if (user.role === 'support') {
                return res.redirect('/support');
            } else {
                return res.redirect('/dashboard');
            }
        });

    } catch (error) {
        res.render('login', { error: 'Terjadi kesalahan pada server.', title: 'Login' });
    }
};

exports.postRegister = async (req, res) => {
    const { name, email, password, password_confirmation, organization, street_1, city, state, postal_code, voice } = req.body;

    if (password !== password_confirmation) {
        return res.render('register', { error: 'Konfirmasi password tidak cocok.', title: 'Registrasi' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('register', { error: 'Email sudah terdaftar.', title: 'Registrasi' });
        }
        
        const customerData = { name, email, organization, street_1, city, state, postal_code, voice, country_code: 'ID', password, password_confirmation };
        const apiCustomer = await domainService.createCustomer(customerData);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const affiliateCode = crypto.randomBytes(4).toString('hex');

        const newUser = new User({
            name, email, password: hashedPassword, organization, street_1, city, state, postal_code, voice,
            country_code: 'ID', customerId: apiCustomer.data.id, affiliateCode: affiliateCode
        });

        await newUser.save();
        
        if (req.cookies && req.cookies.ref_code) {
            const referrer = await User.findOne({ affiliateCode: req.cookies.ref_code });
            if (referrer) {
                await AffiliateReferral.create({ referrer: referrer._id, referredUser: newUser._id });
            }
            res.clearCookie('ref_code');
        }

        req.session.user = {
            id: newUser._id.toString(), name: newUser.name, email: newUser.email,
            role: newUser.role, profilePicture: newUser.profilePicture, affiliateCode: newUser.affiliateCode
        };

        req.session.save((err) => {
            if (err) {
                 return res.render('register', { error: `Gagal memulai sesi: ${err.message}`, title: 'Registrasi' });
            }
            if (req.body.plan) {
                req.session.cart = { type: 'product', item: { name: req.body.plan, price: 0 } };
                return res.redirect('/checkout');
            }
            res.redirect('/dashboard');
        });

    } catch (error) {
        res.render('register', { error: `Terjadi kesalahan: ${error.message}`, title: 'Registrasi' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/dashboard');
        }
        res.redirect('/');
    });
};