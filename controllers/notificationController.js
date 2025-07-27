// controllers/notificationController.js
const { supabase } = require('../supabaseClient');

// ✅ GET /api/notifications
const getNotificationSettings = async (req, res) => {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Fetch error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch notification settings' });
  }

  res.json(data);
};

// ✅ POST /api/notifications
const updateNotificationSettings = async (req, res) => {
  const {
    email_notifications,
    desktop_notifications, // ✅ handle this too
    get_in_touch,
    get_quote,
  } = req.body;

  // Fetch existing row (assume single-row table)
  const { data: existingData, error: fetchError } = await supabase
    .from('notification_settings')
    .select('id')
    .limit(1)
    .single();

  if (fetchError || !existingData) {
    console.error('❌ Fetch error:', fetchError?.message || 'No settings row found');
    return res.status(500).json({ error: 'Unable to retrieve settings row' });
  }

  const { id } = existingData;

  const { error: updateError } = await supabase
    .from('notification_settings')
    .update({
      email_notifications,
      desktop_notifications, // ✅ update this
      get_in_touch,
      get_quote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('❌ Update error:', updateError.message);
    return res.status(500).json({ error: 'Failed to update settings' });
  }

  res.json({ success: true });
};

module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
};
