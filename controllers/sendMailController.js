require('dotenv').config();
const nodemailer = require('nodemailer');
const { supabase } = require('../supabaseClient');
const webpush = require('web-push');

// Set up VAPID keys for web-push
webpush.setVapidDetails(
  'mailto:admin@yourdomain.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// In-memory subscriptions (shared with server.js)
let subscriptions = [];
exports.setSubscriptions = (subs) => {
  subscriptions = subs;
};

// 🔸 Define branch-to-email mappings
const branchEmailMap = {
  BENGALURU: ['kkshetty@ashainfracore.com'],
  SHIVAMOGGA: ['kkshetty@ashainfracore.com'],
  MANGALURU: ['kkshetty@ashainfracore.com'],
};

exports.sendContactMessage = async (req, res) => {
  console.log('📨 [Contact Form] Submission triggered');
  try {
    const { firstName, lastName, email, phone, comments, branch } = req.body;
    console.log('✅ Received data:', req.body);

    // 🔹 Insert to Supabase DB
    const { error: dbError } = await supabase
      .from('contact_messages')
      .insert([{ first_name: firstName, last_name: lastName, email, phone, comments, branch }]);

    if (dbError) {
      console.error('❌ Supabase Insert Error:', dbError.message);
      return res.status(500).json({ error: 'Database insert failed' });
    }

    // 🔹 Fetch settings
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(1);

    if (settingsError) {
      console.error('❌ Failed to load notification settings:', settingsError.message);
      return res.status(500).json({ error: 'Settings fetch error' });
    }

    if (!settings || settings.length === 0) {
      console.warn('⚠️ No notification settings row found!');
      return res.status(500).json({ error: 'No notification settings configured.' });
    }

    const {
      email_notifications,
      get_in_touch,
      desktop_notifications
    } = settings[0];

    // 🔹 Email Notification
    if (email_notifications && get_in_touch) {
      const { EMAIL_USER, EMAIL_PASS, OWNER_EMAIL } = process.env;

      if (!EMAIL_USER || !EMAIL_PASS || !OWNER_EMAIL) {
        console.error('❌ Missing email env variables.');
        return res.status(500).json({ error: 'Email credentials missing in env' });
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
      });

      const branchRecipients = branchEmailMap[branch] || [];
      const allRecipients = [...branchRecipients, OWNER_EMAIL];

      await transporter.sendMail({
        from: `"Asha Infracore Contact" <${EMAIL_USER}>`,
        to: allRecipients,
        subject: 'New Contact Form Submission',
        html: `
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: #f8fafc; padding: 0; min-height: 100vh; position: relative;">
  
  <!-- Compact Professional Banner -->
  <div style="position: relative; background: linear-gradient(135deg, #ff3600 0%, #cc2b00 50%, #ff3600 100%); padding: 20px 20px 16px; overflow: hidden;">
    
    <!-- Banner Pattern Overlay -->
    <div style="position: absolute; inset: 0; opacity: 0.06; background-image: repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.1) 15px, rgba(255,255,255,0.1) 30px);"></div>
    
    <!-- Subtle Geometric Elements -->
    <div style="position: absolute; top: -10px; right: -10px; width: 40px; height: 40px; border: 1px solid rgba(255,255,255,0.08); border-radius: 50%;"></div>
    <div style="position: absolute; bottom: -8px; left: -8px; width: 30px; height: 30px; background: rgba(255,255,255,0.02); transform: rotate(45deg);"></div>
    
    <!-- Compact Header Content -->
    <div style="max-width: 680px; margin: auto; text-align: center; position: relative; z-index: 10;">
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; margin-bottom: 12px; backdrop-filter: blur(8px);">
        <svg style="width: 18px; height: 18px; fill: white;" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
      </div>
      
      <h1 style="color: white; font-size: 22px; font-weight: 700; margin: 0 0 6px 0; letter-spacing: -0.01em; text-shadow: 0 1px 3px rgba(0,0,0,0.15);">
        ASHA INFRACORE
      </h1>
      
      <div style="width: 40px; height: 1px; background: rgba(255,255,255,0.7); margin: 0 auto 8px; border-radius: 1px;"></div>
      
      <p style="color: rgba(255,255,255,0.92); font-size: 14px; font-weight: 600; margin: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.15);">
        New Contact Form Submission
      </p>
    </div>
  </div>

  <!-- Main Content Container -->
  <div style="position: relative; margin-top: -20px; padding: 0 20px 40px;">
    <div style="max-width: 680px; margin: auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 48px rgba(255, 54, 0, 0.10), 0 0 0 1px rgba(255, 54, 0, 0.06); position: relative;">
      
      <!-- Content Section -->
      <div style="padding: 40px 35px 35px;">
        
        <!-- Contact Information Header -->
        <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #f1f5f9;">
          <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 6px 0; letter-spacing: -0.01em;">Contact Details</h2>
          <p style="color: #6b7280; font-size: 15px; margin: 0; font-weight: 500;">Complete information from the contact form</p>
        </div>
        
        <!-- Name Field -->
        <div style="margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%); border-radius: 10px; border: 1px solid #e2e8f0; position: relative; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 12px rgba(255, 54, 0, 0.05)'; this.style.borderColor='rgba(255, 54, 0, 0.12)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='#e2e8f0';">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <div style="width: 30px; height: 30px; background: #ff3600; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-right: 12px; box-shadow: 0 2px 6px rgba(255, 54, 0, 0.15);">
              <svg style="width: 15px; height: 15px; fill: white;" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.12em;">Full Name</div>
          </div>
          <div style="font-size: 16px; color: #1f2937; font-weight: 600; padding-left: 42px; letter-spacing: -0.01em;">${firstName} ${lastName}</div>
        </div>
        
        <!-- Email Field -->
        <div style="margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%); border-radius: 10px; border: 1px solid #e2e8f0; position: relative; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 12px rgba(255, 54, 0, 0.05)'; this.style.borderColor='rgba(255, 54, 0, 0.12)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='#e2e8f0';">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <div style="width: 30px; height: 30px; background: #ff3600; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-right: 12px; box-shadow: 0 2px 6px rgba(255, 54, 0, 0.15);">
              <svg style="width: 15px; height: 15px; fill: white;" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.12em;">Email Address</div>
          </div>
          <div style="font-size: 16px; color: #1f2937; font-weight: 600; padding-left: 42px;">
            <a href="mailto:${email}" style="color: #ff3600; text-decoration: none; transition: all 0.3s ease; font-weight: 600;" onmouseover="this.style.color='#cc2b00'; this.style.textDecoration='underline';" onmouseout="this.style.color='#ff3600'; this.style.textDecoration='none';">${email}</a>
          </div>
        </div>
        
        <!-- Phone Field -->
        <div style="margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%); border-radius: 10px; border: 1px solid #e2e8f0; position: relative; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 12px rgba(255, 54, 0, 0.05)'; this.style.borderColor='rgba(255, 54, 0, 0.12)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='#e2e8f0';">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <div style="width: 30px; height: 30px; background: #ff3600; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-right: 12px; box-shadow: 0 2px 6px rgba(255, 54, 0, 0.15);">
              <svg style="width: 15px; height: 15px; fill: white;" viewBox="0 0 24 24">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.12em;">Phone Number</div>
          </div>
          <div style="font-size: 16px; color: #1f2937; font-weight: 600; padding-left: 42px; letter-spacing: -0.01em;">${phone}</div>
        </div>
        
        <!-- Branch Field -->
        <div style="margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%); border-radius: 10px; border: 1px solid #e2e8f0; position: relative; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 12px rgba(255, 54, 0, 0.05)'; this.style.borderColor='rgba(255, 54, 0, 0.12)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='#e2e8f0';">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <div style="width: 30px; height: 30px; background: #ff3600; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-right: 12px; box-shadow: 0 2px 6px rgba(255, 54, 0, 0.15);">
              <svg style="width: 15px; height: 15px; fill: white;" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.12em;">Branch</div>
          </div>
          <div style="font-size: 16px; color: #1f2937; font-weight: 600; padding-left: 42px; letter-spacing: -0.01em;">${branch}</div>
        </div>
        
        <!-- Message Field -->
        <div style="margin-bottom: 28px; padding: 22px; background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%); border-radius: 10px; border: 1px solid #e2e8f0; position: relative; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 12px rgba(255, 54, 0, 0.05)'; this.style.borderColor='rgba(255, 54, 0, 0.12)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='#e2e8f0';">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <div style="width: 30px; height: 30px; background: #ff3600; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-right: 12px; box-shadow: 0 2px 6px rgba(255, 54, 0, 0.15);">
              <svg style="width: 15px; height: 15px; fill: white;" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.12em;">Message</div>
          </div>
          <div style="font-size: 15px; color: #374151; line-height: 1.6; white-space: pre-wrap; padding-left: 42px; font-weight: 500; letter-spacing: -0.005em;">${comments}</div>
        </div>
        
        <!-- Compact Professional Footer -->
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #ff3600 0%, #cc2b00 100%); border-radius: 10px; color: white; position: relative; overflow: hidden;">
          <div style="position: absolute; inset: 0; opacity: 0.06; background-image: repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.08) 12px, rgba(255,255,255,0.08) 24px);"></div>
          
          <div style="position: relative; z-index: 2;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
              <div style="width: 24px; height: 24px; background: rgba(255,255,255,0.12); border-radius: 5px; display: flex; align-items: center; justify-content: center; margin-right: 8px; backdrop-filter: blur(8px);">
                <svg style="width: 12px; height: 12px; fill: white;" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <p style="font-size: 14px; color: white; margin: 0; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.15);">
                Message sent from <span style="font-weight: 700;">Asha Infracore</span> contact form
              </p>
            </div>
            
            <div style="width: 30px; height: 1px; background: rgba(255,255,255,0.3); margin: 0 auto 8px; border-radius: 1px;"></div>
            
            <p style="font-size: 12px; color: rgba(255,255,255,0.85); margin: 0; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
              Received on ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        
      </div>
    </div>
  </div>

  <style>
    * {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  </style>
</div>
`


      });

      console.log('📧 Email sent to:', allRecipients.join(', '));
    } else {
      console.log('✉️ Email notification skipped by settings');
    }

    // 🔹 Push Notification (desktop)
    if (desktop_notifications && get_in_touch && subscriptions.length > 0) {
      const payload = JSON.stringify({
        title: '📥 New Contact Submission',
        body: `${firstName} ${lastName} from ${branch} submitted the contact form.`,
        url: '/admin-dashboard'
      });

      console.log(`🔔 Sending push to ${subscriptions.length} subscribers`);
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
        } catch (err) {
          console.error('🔔 Push failed for a subscriber:', err.message);
        }
      }
    } else {
      console.log('🔕 Push skipped (no subs or disabled)');
    }

    res.status(200).json({ message: 'Message saved and notifications sent (if enabled).' });

  } catch (err) {
    console.error('❌ Uncaught error in controller:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
