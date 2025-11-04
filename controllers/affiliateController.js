const AffiliateReferral = require('../models/affiliatereferral');
const User = require('../models/user');
const crypto = require('crypto');

const AFFILIATE_MILESTONE_COUNT = 5;
const AFFILIATE_MILESTONE_REWARD = 5000;

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
        
        // Hitung referral yang masih 'pending'
        const pendingReferralsCount = referrals.filter(r => r.status === 'pending').length;
        const referralsNeeded = AFFILIATE_MILESTONE_COUNT - pendingReferralsCount;

        res.render('dashboard/affiliate', {
            user: user,
            referrals,
            referralLink,
            pendingCount: pendingReferralsCount,
            milestoneCount: AFFILIATE_MILESTONE_COUNT,
            milestoneReward: AFFILIATE_MILESTONE_REWARD,
            referralsNeeded: referralsNeeded > 0 ? referralsNeeded : 0,
            title: 'Program Afiliasi'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat halaman afiliasi.');
        res.render('dashboard/affiliate', {
            user: req.session.user, referrals: [], referralLink: '',
            pendingCount: 0, milestoneCount: AFFILIATE_MILESTONE_COUNT, 
            milestoneReward: AFFILIATE_MILESTONE_REWARD, referralsNeeded: AFFILIATE_MILESTONE_COUNT
        });
    }
};

// Fungsi ini bisa dipicu oleh Admin atau cron job
exports.checkAndProcessAffiliatePayouts = async (req, res) => {
    try {
        // Cari semua user yang memiliki referral 'pending'
        const referrers = await AffiliateReferral.distinct('referrer', { status: 'pending' });

        let processedCount = 0;
        for (const referrerId of referrers) {
            const pendingReferrals = await AffiliateReferral.find({
                referrer: referrerId,
                status: 'pending'
            });

            // Jika jumlah referral 'pending' mencapai milestone
            if (pendingReferrals.length >= AFFILIATE_MILESTONE_COUNT) {
                // Beri reward
                await User.findByIdAndUpdate(referrerId, {
                    $inc: { creditBalance: AFFILIATE_MILESTONE_REWARD }
                });

                // Tandai referral yang sudah diproses sebagai 'credited'
                const idsToUpdate = pendingReferrals.slice(0, AFFILIATE_MILESTONE_COUNT).map(r => r._id);
                await AffiliateReferral.updateMany(
                    { _id: { $in: idsToUpdate } },
                    { status: 'credited' }
                );
                
                processedCount++;
            }
        }
        // Redirect untuk Admin
        if (res) {
            req.flash('success_msg', `${processedCount} pengguna afiliasi berhasil diproses dan mendapatkan reward.`);
            return res.redirect('/admin');
        }

    } catch (error) {
        if (res) {
            req.flash('error_msg', `Gagal memproses payout afiliasi: ${error.message}`);
            return res.redirect('/admin');
        }
    }
};