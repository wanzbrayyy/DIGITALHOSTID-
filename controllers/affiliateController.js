const AffiliateReferral = require('../models/affiliatereferral');
const User = require('../models/user');
const crypto = require('crypto');

exports.getAffiliatePage = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
       
        if (!user.affiliateCode) {
            user.affiliateCode = crypto.randomBytes(4).toString('hex');
            await user.save();
            req.session.user.affiliateCode = user.affiliateCode;
        }

        const referrals = await AffiliateReferral.find({ referrer: req.session.user.id })
            .populate('referredUser', 'name createdAt')
            .sort({ createdAt: -1 });
            
        const referralLink = `${process.env.APP_BASE_URL}/register?ref=${user.affiliateCode}`;

        res.render('dashboard/affiliate', {
            user: user,
            referrals,
            referralLink, 
            title: 'Program Afiliasi'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat halaman afiliasi.');
        res.render('dashboard/affiliate', {
            user: req.session.user,
            referrals: [],
            referralLink: 'Gagal memuat link. Periksa konfigurasi server.',
            title: 'Program Afiliasi'
        });
    }
};