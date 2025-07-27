require('dotenv').config();
const nodemailer = require('nodemailer');
const { supabase } = require('../supabaseClient');
const webpush = require('web-push');

// Import getSubscriptions function from routes
const { getSubscriptions } = require('../routes/notificationRoutes');

// Set VAPID keys
webpush.setVapidDetails(
  'mailto:admin@yourdomain.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.sendQuoteMessage = async (req, res) => {
  try {
    const {
      client_name,
      email,
      phone,
      company,
      street,
      city,
      state,
      country,
      zip,
      interest,
      comments,
      total_amount
    } = req.body;

    console.log("📨 Received quote form submission:", req.body);

    // ✅ 1. Save to Supabase
    const { error: dbError } = await supabase
      .from('quotations')
      .insert([{
        client_name,
        email,
        phone,
        company,
        street,
        city,
        state,
        country,
        zip,
        interest,
        comments,
        total_amount,
        status: 'pending'
      }]);

    if (dbError) {
      console.error('❌ Supabase Insert Error:', dbError);
      return res.status(500).json({ error: 'Database insert failed' });
    }

    // ✅ 2. Fetch notification settings
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError) {
      console.error('❌ Failed to fetch notification settings:', settingsError);
      return res.status(500).json({ error: 'Settings fetch error' });
    }

    const emailEnabled = settings?.email_notifications;
    const quoteEnabled = settings?.get_quote;
    const pushEnabled = settings?.desktop_notifications;

    // ✅ 3. Email Notification
    if (emailEnabled && quoteEnabled) {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.TO_EMAIL) {
        console.error("❌ Missing email config in .env");
        return res.status(500).json({ error: 'Email credentials missing' });
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"Asha Infracore Quote" <${process.env.EMAIL_USER}>`,
        to: process.env.TO_EMAIL,
        subject: 'New Get a Quote Form Submission',
        html: `
          <h2>New Quotation Request</h2>
          <p><strong>Name:</strong> ${client_name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>Address:</strong> ${street}, ${city}, ${state}, ${zip}, ${country}</p>
          <p><strong>Interest:</strong> ${interest}</p>
          <p><strong>Comments:</strong><br>${comments}</p>
          <p><strong>Estimated Total:</strong> ₹${total_amount}</p>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Quote email sent:", info.messageId);
    } else {
      console.log("⚠️ Quote email notification disabled in settings");
    }

    // ✅ 4. Push Notification
    const subscriptions = getSubscriptions();
    if (pushEnabled && quoteEnabled && subscriptions.length > 0) {
      const payload = JSON.stringify({
        title: '🧾 New Quote Request',
        body: `${client_name} submitted a new quote request.`,
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
        } catch (pushErr) {
          console.error('🔔 Push error for one sub:', pushErr.message);
        }
      }

      console.log("✅ Push notifications sent for quote submission");
    } else {
      console.log("🔕 Quote push notification skipped");
    }

    return res.status(200).json({ message: 'Quote saved and notifications sent (if enabled).' });

  } catch (err) {
    console.error('❌ Uncaught quote controller error:', err.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
