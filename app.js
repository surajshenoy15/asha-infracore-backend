require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// Routes
const productRoutes = require("./routes/products");
const attachmentRoutes = require("./routes/attachments");
const quotationRoutes = require("./routes/quotations");
const quoteRoutes = require("./routes/quoteRoutes");
const contactRoutes = require("./routes/contact");
const {
  router: notificationRoutes,
} = require("./routes/notificationRoutes");

const authRoutes = require("./routes/authRoutes");
const { protect } = require("./middleware/authMiddleware");

const { setSubscriptions } = require("./controllers/sendMailController");

const subscriptions = [];
setSubscriptions(subscriptions);

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "https://asha-infracore-frontend.onrender.com",
  "https://asha-infracore.vercel.app",
  "https://www.ashainfracore.com",
  "https://ashainfracore.com",
  "https://asha-infracore-iota.vercel.app",
  "https://asha-infracore-sandy.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed for this origin"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Route registration
app.use("/api/products", productRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/quote", quoteRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/auth", authRoutes);

// Protected admin test route
app.get("/api/admin/data", protect, (req, res) => {
  res.json({
    message: "✅ Protected admin route accessed",
    user: req.admin,
  });
});

// Health/root route
app.get("/", (req, res) => {
  res.send("✅ Asha Infracore Backend is Running");
});

module.exports = app;