const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const {
  getNotificationSettings,
  updateNotificationSettings
} = require('../controllers/notificationController');

// ✅ VAPID Key setup
webpush.setVapidDetails(
  'mailto:admin@yourdomain.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ✅ In-memory subscription store (replace with DB for production)
const subscriptions = [];

// 🔄 Utility to access subscriptions externally
const getSubscriptions = () => subscriptions;

// ✅ Route: Get current notification settings
router.get('/', getNotificationSettings);

// ✅ Route: Update settings from Admin UI
router.post('/', updateNotificationSettings);

// ✅ Route: Save client push subscription
router.post('/subscribe', (req, res) => {
  const subscription = req.body;

  // Prevent duplicates
  const exists = subscriptions.some(
    (sub) => JSON.stringify(sub) === JSON.stringify(subscription)
  );

  if (!exists) {
    subscriptions.push(subscription);
    console.log('✅ New push subscription saved');
  } else {
    console.log('ℹ️ Subscription already exists');
  }

  res.status(201).json({ message: 'Subscription saved' });
});

// ✅ Route: Trigger test push manually
router.post('/test', async (req, res) => {
  const { title, body, url } = req.body || {};

  const payload = JSON.stringify({
    title: title || '🔔 Test Notification',
    body: body || 'This is a test push notification!',
    url: url || '/admin-dashboard',
  });

  if (subscriptions.length === 0) {
    return res.status(200).json({ message: '⚠️ No subscribers to send to.' });
  }

  try {
    for (const sub of subscriptions) {
      await webpush.sendNotification(sub, payload);
    }
    console.log(`✅ Push notification sent to ${subscriptions.length} subscribers`);
    res.status(200).json({ message: 'Push notification sent.' });
  } catch (error) {
    console.error('❌ Error sending push:', error);
    res.status(500).json({ error: 'Push notification failed' });
  }
});

// ✅ Route: Send generic push (used in controller)
router.post('/send', async (req, res) => {
  const payload = JSON.stringify({
    title: '📥 New Form Submission',
    body: 'Someone submitted the contact form!',
    url: '/admin-dashboard',
  });

  try {
    for (const sub of subscriptions) {
      await webpush.sendNotification(sub, payload);
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Push error:', error);
    res.sendStatus(500);
  }
});

// ✅ Export router and subscription accessor
module.exports = {
  router,
  getSubscriptions,
};
