require('dotenv').config();
const nodemailer = require('nodemailer');
const { supabase } = require('../supabaseClient');
const webpush = require('web-push');
const { getSubscriptions } = require('../routes/notificationRoutes');

// Set VAPID keys for push notifications
webpush.setVapidDetails(
  'mailto:admin@yourdomain.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// 🔹 Define branch-wise recipient mapping
const branchEmailMap = {
  BENGALURU: ['surajshenoy296@gmail.com', 'surajshenoyp@gmail.com'],
  SHIVAMOGGA: ['sushmithakshetty2005@gmail.com', 'foodsaver.bnmit@gmail.com'],
  MANGALURU: ['mang1@gmail.com', 'mang2@gmail.com'],
};


exports.sendContactMessage = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, comments, branch } = req.body;
    console.log("📥 Received contact form data:", req.body);

    // ✅ Save to Supabase
    const { error: dbError } = await supabase
      .from('contact_messages')
      .insert([{ first_name: firstName, last_name: lastName, email, phone, comments, branch }]);

    if (dbError) {
      console.error("❌ Supabase DB Error:", dbError);
      return res.status(500).json({ error: 'Database insert failed' });
    }

    // ✅ Fetch notification settings
    const { data: notifSettings, error: notifError } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(1)
      .single();

    if (notifError) {
      console.error("❌ Error fetching notification settings:", notifError);
      return res.status(500).json({ error: 'Failed to fetch notification settings' });
    }

    const emailEnabled = notifSettings?.email_notifications;
    const getInTouchEnabled = notifSettings?.get_in_touch;
    const pushEnabled = notifSettings?.desktop_notifications;

    // ✅ Send Email
    if (emailEnabled && getInTouchEnabled) {
      const { EMAIL_USER, EMAIL_PASS, OWNER_EMAIL } = process.env;

      if (!EMAIL_USER || !EMAIL_PASS || !OWNER_EMAIL) {
        console.error("❌ Missing email env variables.");
        return res.status(500).json({ error: 'Email configuration missing' });
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS,
        },
      });

      // 🔸 Get branch-specific emails
      const branchRecipients = branchEmailMap[branch] || [];
      if (branchRecipients.length === 0) {
        console.warn(`⚠️ No email mapping found for branch: ${branch}`);
      }

      const allRecipients = [...branchRecipients, OWNER_EMAIL];

      const info = await transporter.sendMail({
        from: `"Asha Infracore Contact" <${EMAIL_USER}>`,
        to: allRecipients,
        subject: 'New Contact Form Submission',
        html: `
          <h2>New Contact Message</h2>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Branch:</strong> ${branch}</p>
          <p><strong>Message:</strong><br>${comments}</p>
        `,
      });

      console.log(`📧 Email sent to: ${allRecipients.join(', ')}`);
    } else {
      console.log("⚠️ Email notifications are disabled.");
    }

    // ✅ Send Desktop Push Notification
    const subscriptions = getSubscriptions();
    if (pushEnabled && getInTouchEnabled && subscriptions.length > 0) {
      const payload = JSON.stringify({
        title: '📩 New Contact Message',
        body: `${firstName} ${lastName} from ${branch} just submitted the contact form.`,
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
        } catch (pushErr) {
          console.error("🔔 Push notification error:", pushErr);
        }
      }

      console.log("✅ Push notifications sent.");
    } else {
      console.log("🔕 Push notifications skipped.");
    }

    return res.status(200).json({ message: 'Message saved. Notifications sent if enabled.' });

  } catch (error) {
    console.error("❌ Controller Error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
