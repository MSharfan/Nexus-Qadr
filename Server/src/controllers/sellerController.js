import { readSellerDocs, writeSellerDocs } from '../utils/sellerStore.js';

// GET /seller/documents
export const getSellerDocuments = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const data = readSellerDocs(userId) || null;
    res.json({ documents: data });
  } catch (err) {
    console.error('Get Seller Documents Error:', err);
    res.status(500).json({ message: 'Failed to load documents' });
  }
};

// POST /seller/documents
export const saveSellerDocuments = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const payload = req.body;
    // basic validation
    if (!payload) return res.status(400).json({ message: 'No data provided' });

    const ok = writeSellerDocs(userId, payload);
    if (!ok) return res.status(500).json({ message: 'Failed to save documents' });

    res.json({ message: 'Saved' });
  } catch (err) {
    console.error('Save Seller Documents Error:', err);
    res.status(500).json({ message: 'Failed to save documents' });
  }
};
