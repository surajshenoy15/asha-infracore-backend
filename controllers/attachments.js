const { supabase } = require('../supabaseClient');

const uploadAttachment = async (req, res) => {
  try {
    const { name, description, category } = req.body;
    const file = req.file;

    if (!name || !category || !file) {
      return res.status(400).json({ error: 'Name, category, and image are required' });
    }

    const uploadPath = `attachments/${Date.now()}_${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(uploadPath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      return res.status(500).json({ error: 'Image upload failed' });
    }

    const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/attachments/${uploadData.path}`;

    const insertData = {
      name,
      description,
      category: category.toLowerCase().replace(/\s+/g, '-'),
      image: imageUrl,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('attachments')
      .insert([insertData]);

    if (insertError) {
      return res.status(500).json({ error: 'Failed to insert attachment' });
    }

    res.status(200).json(inserted);
  } catch (err) {
    console.error('UploadAttachment Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllAttachments = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('GetAllAttachments Error:', err);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
};

const updateAttachment = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description, category } = req.body;

    let image = null;

    if (req.file) {
      const uploadPath = `attachments/${Date.now()}_${req.file.originalname}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(uploadPath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        return res.status(500).json({ error: 'Image upload failed' });
      }

      image = `${process.env.SUPABASE_URL}/storage/v1/object/public/attachments/${uploadData.path}`;
    }

    const updateData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(category && { category: category.toLowerCase().replace(/\s+/g, '-') }),
      ...(image && { image }),
    };

    const { data, error } = await supabase
      .from('attachments')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      return res.status(500).json({ error: 'Failed to update attachment' });
    }

    res.status(200).json(data[0]);
  } catch (err) {
    console.error('UpdateAttachment Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('attachments')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete attachment' });
    }

    res.status(200).json({ message: 'Attachment deleted successfully' });
  } catch (err) {
    console.error('DeleteAttachment Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  uploadAttachment,
  getAllAttachments,
  updateAttachment,
  deleteAttachment,
};
