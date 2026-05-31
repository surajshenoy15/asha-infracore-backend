const express = require('express');
const router = express.Router();
const webpush = require('web-push');

const {
  getNotificationSettings,
  updateNotificationSettings,
} = require('../controllers/notificationController');

// ✅ VAPID keys from .env
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

// ✅ Setup VAPID only if keys exist
if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn('⚠️ VAPID keys are missing. Push notifications will not work.');
} else {
  webpush.setVapidDetails(
    'mailto:admin@ashainfracore.com',
    vapidPublicKey,
    vapidPrivateKey
  );

  console.log('✅ VAPID keys configured successfully');
}

// ✅ In-memory subscription store
// NOTE: In AWS Lambda, this is temporary. Later we should store subscriptions in Supabase.
const subscriptions = [];

// 🔄 Utility to access subscriptions externally
const getSubscriptions = () => subscriptions;

// ✅ Check if push notifications are configured
const isPushConfigured = () => {
  return Boolean(vapidPublicKey && vapidPrivateKey);
};

// ✅ Route: Get current notification settings
router.get('/', getNotificationSettings);

// ✅ Route: Update settings from Admin UI
router.post('/', updateNotificationSettings);

// ✅ Route: Save client push subscription
router.post('/subscribe', (req, res) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({
      success: false,
      message: 'Invalid subscription object',
    });
  }

  const exists = subscriptions.some(
    (sub) => sub.endpoint === subscription.endpoint
  );

  if (!exists) {
    subscriptions.push(subscription);
    console.log('✅ New push subscription saved');
  } else {
    console.log('ℹ️ Subscription already exists');
  }

  return res.status(201).json({
    success: true,
    message: 'Subscription saved',
    totalSubscribers: subscriptions.length,
  });
});

// ✅ Route: Trigger test push manually
router.post('/test', async (req, res) => {
  if (!isPushConfigured()) {
    return res.status(500).json({
      success: false,
      error: 'VAPID keys are missing. Push notification is not configured.',
    });
  }

  const { title, body, url } = req.body || {};

  const payload = JSON.stringify({
    title: title || '🔔 Test Notification',
    body: body || 'This is a test push notification!',
    url: url || '/admin-dashboard',
  });

  if (subscriptions.length === 0) {
    return res.status(200).json({
      success: false,
      message: '⚠️ No subscribers to send to.',
    });
  }

  try {
    let successCount = 0;
    let failedCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub, payload);
        successCount++;
      } catch (error) {
        failedCount++;
        console.error('❌ Error sending push to subscriber:', error.message);
      }
    }

    console.log(
      `✅ Push completed. Success: ${successCount}, Failed: ${failedCount}`
    );

    return res.status(200).json({
      success: true,
      message: 'Push notification process completed.',
      successCount,
      failedCount,
      totalSubscribers: subscriptions.length,
    });
  } catch (error) {
    console.error('❌ Error sending push:', error);

    return res.status(500).json({
      success: false,
      error: 'Push notification failed',
    });
  }
});

// ✅ Route: Send generic push
router.post('/send', async (req, res) => {
  if (!isPushConfigured()) {
    return res.status(500).json({
      success: false,
      error: 'VAPID keys are missing. Push notification is not configured.',
    });
  }

  const payload = JSON.stringify({
    title: '📥 New Form Submission',
    body: 'Someone submitted the contact form!',
    url: '/admin-dashboard',
  });

  if (subscriptions.length === 0) {
    return res.status(200).json({
      success: false,
      message: '⚠️ No subscribers to send to.',
    });
  }

  try {
    let successCount = 0;
    let failedCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub, payload);
        successCount++;
      } catch (error) {
        failedCount++;
        console.error('❌ Push error for subscriber:', error.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Generic push notification process completed.',
      successCount,
      failedCount,
      totalSubscribers: subscriptions.length,
    });
  } catch (error) {
    console.error('❌ Push error:', error);

    return res.status(500).json({
      success: false,
      error: 'Push notification failed',
    });
  }
});

// ✅ Export router and subscription accessor
module.exports = {
  router,
  getSubscriptions,
};