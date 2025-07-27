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

// ✅ Reusable function: Upload images and PDFs to Supabase
const uploadFilesToSupabase = async (files) => {
  const fileUrls = {};

  const getPublicUrl = (path) =>
    `${process.env.SUPABASE_URL}/storage/v1/object/public/products/${path}`;

  // Upload images
  for (const key of ['image1', 'image2', 'image3', 'image4']) {
    if (files[key]) {
      const file = files[key][0];
      const cleanName = sanitizeFileName(file.originalname);
      const uploadPath = `images/${Date.now()}_${cleanName}`;

      const { error } = await supabase.storage
        .from('products')
        .upload(uploadPath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) throw new Error(`Image upload failed: ${error.message}`);
      fileUrls[key] = getPublicUrl(uploadPath);
    }
  }

  // Upload main brochure PDF
  if (files['pdfFile']) {
    const file = files['pdfFile'][0];
    const cleanName = sanitizeFileName(file.originalname);
    const path = `pdfs/${Date.now()}_${cleanName}`;

    const { error } = await supabase.storage
      .from('products')
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw new Error(`PDF upload failed: ${error.message}`);
    fileUrls.pdf_url = getPublicUrl(path);
  }

  // Upload specification PDF
  if (files['specPdfFile']) {
    const file = files['specPdfFile'][0];
    const cleanName = sanitizeFileName(file.originalname);
    const path = `specs/${Date.now()}_${cleanName}`;

    const { error } = await supabase.storage
      .from('products')
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw new Error(`Spec PDF upload failed: ${error.message}`);
    fileUrls.spec_pdf_url = getPublicUrl(path);
  }

  return fileUrls;
};

// ✅ Create a new product
const uploadProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      horsepower,
      rated_operating_capacity,
      rated_operating_capacity_unit,
      operating_weight,
      dig_depth,
      category,
      features,
      specifications,
      featured,
    } = req.body;

    if (!name || !category || !req.files?.image1) {
      return res.status(400).json({ error: 'Name, category, and image1 are required' });
    }

    const fileUrls = await uploadFilesToSupabase(req.files);

    // Safely parse features
    const parsedFeatures = safeParseFeatures(features);

    const insertData = {
      name,
      description,
      horsepower: horsepower ? parseFloat(horsepower) : null,
      rated_operating_capacity: rated_operating_capacity ? parseFloat(rated_operating_capacity) : null,
      rated_operating_capacity_unit: rated_operating_capacity_unit || 'kg',
      operating_weight: operating_weight ? parseFloat(operating_weight) : null,
      dig_depth: dig_depth ? parseFloat(dig_depth) : null,
      category: category.toLowerCase().replace(/\s+/g, '-'),
      features: parsedFeatures,  // This will be stored as JSONB
      specifications: specifications || '',
      featured: featured === 'true' || featured === true,
      image1: fileUrls.image1,
      image2: fileUrls.image2 || null,
      image3: fileUrls.image3 || null,
      image4: fileUrls.image4 || null,
      pdf_url: fileUrls.pdf_url || null,
      spec_pdf_url: fileUrls.spec_pdf_url || null,
    };

    const { data, error } = await supabase.from('products').insert([insertData]).select();
    if (error) {
      console.error('Insert error:', error);
      return res.status(500).json({ error: 'Failed to insert product' });
    }

    res.status(200).json(data[0]);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// ✅ Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      horsepower,
      rated_operating_capacity,
      rated_operating_capacity_unit,
      operating_weight,
      dig_depth,
      category,
      features,
      specifications,
      featured,
    } = req.body;

    let fileUrls = {};
    if (req.files && Object.keys(req.files).length > 0) {
      fileUrls = await uploadFilesToSupabase(req.files);
      console.log('Uploaded file URLs:', fileUrls);
    }

    // Safely parse features
    const parsedFeatures = features ? safeParseFeatures(features) : undefined;

    const updateData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(horsepower && { horsepower: parseFloat(horsepower) }),
      ...(rated_operating_capacity && { rated_operating_capacity: parseFloat(rated_operating_capacity) }),
      ...(rated_operating_capacity_unit && { rated_operating_capacity_unit }),
      ...(operating_weight && { operating_weight: parseFloat(operating_weight) }),
      ...(dig_depth && { dig_depth: parseFloat(dig_depth) }),
      ...(category && { category: category.toLowerCase().replace(/\s+/g, '-') }),
      ...(parsedFeatures !== undefined && { features: parsedFeatures }),
      ...(specifications && { specifications }),
      ...(featured !== undefined && { featured: featured === 'true' || featured === true }),
      ...(fileUrls.image1 && { image1: fileUrls.image1 }),
      ...(fileUrls.image2 && { image2: fileUrls.image2 }),
      ...(fileUrls.image3 && { image3: fileUrls.image3 }),
      ...(fileUrls.image4 && { image4: fileUrls.image4 }),
      ...(fileUrls.pdf_url && { pdf_url: fileUrls.pdf_url }),
      ...(fileUrls.spec_pdf_url && { spec_pdf_url: fileUrls.spec_pdf_url }),
    };

    const { data, error } = await supabase.from('products').update(updateData).eq('id', id).select();

    if (error) {
      console.error('Update error:', error);
      return res.status(500).json({ error: 'Failed to update product' });
    }

    res.status(200).json(data[0]);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// ✅ Get all products
const getAllProducts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// ✅ Get single product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

// ✅ Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return res.status(500).json({ error: 'Failed to delete product' });

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  uploadProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};