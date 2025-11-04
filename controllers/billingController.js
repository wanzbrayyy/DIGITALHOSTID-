const User = require('../models/user');
const Invoice = require('../models/invoice');
const midtransClient = require('midtrans-client');
const crypto = require('crypto');

const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

exports.getDepositPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('dashboard/deposit', {
            user: user,
            title: 'Deposit Saldo',
            clientKey: process.env.MIDTRANS_CLIENT_KEY
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat halaman deposit.');
        res.redirect('/dashboard');
    }
};

exports.processDeposit = async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findById(req.session.user.id);
        if (!amount || amount < 10000) {
            return res.status(400).json({ error: 'Jumlah deposit minimal Rp 10.000.' });
        }

        const orderId = `DEPOSIT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        
        const parameter = {
            transaction_details: { order_id: orderId, gross_amount: amount },
            customer_details: { first_name: user.name, email: user.email, phone: user.voice }
        };

        const token = await snap.createTransactionToken(parameter);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Gagal membuat token pembayaran.' });
    }
};

exports.getInvoicesPage = async (req, res) => {
    try {
        const invoices = await Invoice.find({ user: req.session.user.id }).sort({ createdAt: -1 });
        res.render('dashboard/invoices', {
            user: req.session.user,
            invoices,
            title: 'Riwayat Faktur'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat riwayat faktur.');
        res.render('dashboard/invoices', { user: req.session.user, invoices: [], title: 'Riwayat Faktur' });
    }
};

exports.handleMidtransNotification = async (req, res) => {
    try {
        const notificationJson = req.body;
        const statusResponse = await snap.transaction.notification(notificationJson);
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
            if (fraudStatus == 'accept') {
                if (orderId.startsWith('DEPOSIT-')) {
                    const invoice = await Invoice.findOne({ invoiceId: orderId });
                    if (invoice && invoice.status === 'unpaid') {
                        await User.findByIdAndUpdate(invoice.user, { $inc: { creditBalance: invoice.totalAmount } });
                        invoice.status = 'paid';
                        await invoice.save();
                    }
                }
            }
        }
        res.status(200).send('OK');
    } catch (error) {
        res.status(500).send('Error');
    }
};