const { supabase } = require('../supabaseClient');

// 🔐 Utility: Sanitize filenames for Supabase
const sanitizeFileName = (filename) => {
  return filename
    .normalize('NFD')                      // Normalize unicode
    .replace(/[\u0300-\u036f]/g, '')      // Remove accents
    .replace(/\s+/g, '_')                 // Replace spaces with _
    .replace(/[^a-zA-Z0-9_.-]/g, '')      // Remove invalid chars
    .toLowerCase();                       // Lowercase
};

// 🛠️ Utility: Safely parse features
const safeParseFeatures = (features) => {
  if (!features) return null;
  
  try {
    // If it's already an object/array, return as-is
    if (typeof features === 'object') {
      return features;
    }
    
    // If it's a string, try to parse it
    if (typeof features === 'string') {
      // Check for invalid data
      if (features === '[object Object]' || features.includes('[object Object]')) {
        console.warn('Invalid features string detected, returning null');
        return null;
      }
      
      // Try to parse as JSON
      return JSON.parse(features);
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing features:', error);
    return null;
  }
};

// 📤 Upload to Supabase Storage with improved error handling
const uploadFileToSupabase = async (file, folder = 'attachments') => {
  const cleanName = sanitizeFileName(file.originalname);
  const uploadPath = `${folder}/${Date.now()}_${cleanName}`;

  const { error: uploadError } = await supabase.storage
    .from('products') // Using same bucket as products for consistency
    .upload(uploadPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (uploadError) {
    console.error('❌ Upload error:', uploadError.message);
    throw new Error(`File upload failed: ${uploadError.message}`);
  }

  // Use direct public URL construction for consistency
  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/products/${uploadPath}`;
  return publicUrl;
};

// ✅ Create Attachment
const uploadAttachment = async (req, res) => {
  try {
    console.log('📝 Creating attachment...');
    console.log('📝 Request body:', req.body);
    console.log('📝 Request files:', req.files);

    const {
      name,
      description,
      category,
      features,
      specifications = '',
    } = req.body;

    // Check for files in different possible locations
    const imageFile = req.files?.image?.[0] || req.file;
    const pdfFile = req.files?.pdfFile?.[0];
    const specPdfFile = req.files?.specPdfFile?.[0];

    console.log('📝 Parsed data:', { 
      name, 
      category, 
      imageFile: !!imageFile,
      pdfFile: !!pdfFile,
      specPdfFile: !!specPdfFile
    });

    if (!name || !category || !imageFile) {
      console.error('❌ Missing required fields:', { name: !!name, category: !!category, imageFile: !!imageFile });
      return res.status(400).json({ error: 'Name, category, and image are required' });
    }

    console.log('📤 Uploading files to Supabase...');
    
    // Upload image
    const imageUrl = await uploadFileToSupabase(imageFile, 'attachments');
    console.log('✅ Image uploaded:', imageUrl);

    // Upload PDFs if provided
    let pdfUrl = null;
    let specPdfUrl = null;

    if (pdfFile) {
      pdfUrl = await uploadFileToSupabase(pdfFile, 'attachments/pdfs');
      console.log('✅ PDF uploaded:', pdfUrl);
    }

    if (specPdfFile) {
      specPdfUrl = await uploadFileToSupabase(specPdfFile, 'attachments/specs');
      console.log('✅ Spec PDF uploaded:', specPdfUrl);
    }

    // ✅ Safely parse features using the utility function
    const parsedFeatures = safeParseFeatures(features);
    console.log('📝 Parsed features:', parsedFeatures);

    const insertData = {
      name,
      description: description || '',
      category: category.trim(),
      image: imageUrl,
      pdf_url: pdfUrl,
      spec_pdf_url: specPdfUrl,
      features: parsedFeatures,  // This will be stored as JSONB
      specifications: specifications || '',
    };

    console.log('📝 Insert data:', insertData);

    const { data, error } = await supabase.from('attachments').insert([insertData]).select();

    if (error) {
      console.error('❌ Insert error:', error);
      return res.status(500).json({ error: 'Failed to insert attachment', details: error.message });
    }

    console.log('✅ Attachment created successfully:', data[0]);
    res.status(200).json(data[0]);
  } catch (err) {
    console.error('❌ UploadAttachment Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// ✅ Get All Attachments
const getAllAttachments = async (req, res) => {
  try {
    console.log('📋 Fetching all attachments...');

    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Fetch error:', error);
      throw error;
    }

    console.log('✅ Fetched attachments:', data?.length || 0);
    res.status(200).json(data);
  } catch (err) {
    console.error('❌ GetAllAttachments Error:', err);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
};

// ✅ Get single attachment by ID
const getAttachmentById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📋 Fetching attachment by ID:', id);

    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('❌ Attachment not found:', error);
      return res.status(404).json({ error: 'Attachment not found' });
    }

    console.log('✅ Attachment found:', data.name);
    res.json(data);
  } catch (err) {
    console.error('❌ Get attachment error:', err);
    res.status(500).json({ error: 'Failed to fetch attachment' });
  }
};

// ✅ Update Attachment
const updateAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 Updating attachment with ID:', id);
    console.log('📝 Request body:', req.body);
    console.log('📝 Request files:', req.files);

    const {
      name,
      description,
      category,
      features,
      specifications,
    } = req.body;

    // Validate that attachment exists first
    const { data: existingAttachment, error: fetchError } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingAttachment) {
      console.error('❌ Attachment not found:', fetchError);
      return res.status(404).json({ error: 'Attachment not found' });
    }

    console.log('✅ Existing attachment found:', existingAttachment.name);

    // Check for files in different possible locations
    const imageFile = req.files?.image?.[0] || req.file;
    const pdfFile = req.files?.pdfFile?.[0];
    const specPdfFile = req.files?.specPdfFile?.[0];

    let imageUrl, pdfUrl, specPdfUrl;

    // Upload new files if provided
    if (imageFile) {
      console.log('📤 Uploading new image...');
      imageUrl = await uploadFileToSupabase(imageFile, 'attachments');
      console.log('✅ Image uploaded:', imageUrl);
    }

    if (pdfFile) {
      console.log('📤 Uploading new PDF...');
      pdfUrl = await uploadFileToSupabase(pdfFile, 'attachments/pdfs');
      console.log('✅ PDF uploaded:', pdfUrl);
    }

    if (specPdfFile) {
      console.log('📤 Uploading new spec PDF...');
      specPdfUrl = await uploadFileToSupabase(specPdfFile, 'attachments/specs');
      console.log('✅ Spec PDF uploaded:', specPdfUrl);
    }

    // ✅ Safely parse features using the utility function
    const parsedFeatures = features ? safeParseFeatures(features) : undefined;

    const updateData = {
      ...(name && { name }),
      ...(description !== undefined && { description: description || '' }),
      ...(category && { category: category.toLowerCase().replace(/\s+/g, '-') }),
      ...(parsedFeatures !== undefined && { features: parsedFeatures }),
      ...(specifications !== undefined && { specifications: specifications || '' }),
      ...(imageUrl && { image: imageUrl }),
      ...(pdfUrl && { pdf_url: pdfUrl }),
      ...(specPdfUrl && { spec_pdf_url: specPdfUrl }),
    };

    console.log('📝 Update data:', updateData);

    const { data, error } = await supabase.from('attachments')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Update error:', error);
      return res.status(500).json({ error: 'Failed to update attachment', details: error.message });
    }

    if (!data || data.length === 0) {
      console.error('❌ No data returned after update');
      return res.status(404).json({ error: 'Attachment not found after update' });
    }

    console.log('✅ Attachment updated successfully');
    res.status(200).json(data[0]);
  } catch (err) {
    console.error('❌ UpdateAttachment Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// ✅ Delete Attachment
const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting attachment with ID:', id);

    // First check if attachment exists
    const { data: existingAttachment, error: fetchError } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingAttachment) {
      console.error('❌ Attachment not found for deletion:', fetchError);
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const { error } = await supabase
      .from('attachments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete attachment', details: error.message });
    }

    console.log('✅ Attachment deleted successfully');
    res.status(200).json({ message: 'Attachment deleted successfully' });
  } catch (err) {
    console.error('❌ DeleteAttachment Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  uploadAttachment,
  getAllAttachments,
  getAttachmentById,
  updateAttachment,
  deleteAttachment,
};