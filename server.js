require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cloudinary = require('cloudinary').v2; // ✅ Cloudinary

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Import Routes
const productRoutes = require('./routes/products');
const attachmentRoutes = require('./routes/attachments');
const quotationRoutes = require('./routes/quotations');
const quoteRoutes = require('./routes/quoteRoutes');
const contactRoutes = require('./routes/contact');
const { router: notificationRoutes, getSubscriptions } = require('./routes/notificationRoutes');

// ✅ Auth
const authRoutes = require('./routes/authRoutes');
const { protect } = require('./middleware/authMiddleware');

// ✅ Desktop Push Subscriptions
const { setSubscriptions } = require('./controllers/sendMailController');
const subscriptions = [];
setSubscriptions(subscriptions);

// ✅ Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'https://asha-infracore-frontend.onrender.com',
  'https://asha-infracore.vercel.app',
  'https://ashainfracore.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// ✅ Route Registration
app.use('/api/products', productRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/quote', quoteRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', authRoutes);

// ✅ Protected Admin Test Route
app.get('/api/admin/data', protect, (req, res) => {
  res.json({ message: "✅ Protected admin route accessed", user: req.admin });
});

// ✅ Health Check
app.get('/', (req, res) => {
  res.send('✅ Asha Infracore Backend is Running');
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
