require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const connectDB = require('./config/db');
const { fetchNotifications } = require('./middleware/notificationMiddleware');
const cookieParser = require('cookie-parser');

const startServer = async () => {
    try {
        await connectDB();
        console.log('MongoDB berhasil terhubung...');

        const app = express();
        
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));
        app.use(cookieParser());
        app.use(express.static(path.join(__dirname, 'public')));

        app.set('view engine', 'ejs');
        app.set('views', path.join(__dirname, 'views'));

        app.use(session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
            cookie: { maxAge: 1000 * 60 * 60 * 24 }
        }));

        app.use(flash());
        app.use(fetchNotifications);

        app.use((req, res, next) => {
            res.locals.user = req.session.user || null;
            res.locals.success_msg = req.flash('success_msg');
            res.locals.error_msg = req.flash('error_msg');
            next();
        });

        app.use('/', require('./routes/mainRoutes'));
        app.use('/', require('./routes/authRoutes'));
        app.use('/', require('./routes/checkoutRoutes'));
        app.use('/', require('./routes/dashboardRoutes'));
        app.use('/', require('./routes/serviceRoutes'));
        app.use('/', require('./routes/ticketRoutes'));
        app.use('/', require('./routes/affiliateRoutes'));
        app.use('/admin', require('./routes/adminRoutes'));
        app.use('/api', require('./routes/apiRoutes'));
        app.use('/', require('./routes/supportRoutes')); 

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));

    } catch (error) {
        console.error('GAGAL MEMULAI SERVER:', error);
        process.exit(1);
    }
};

startServer();