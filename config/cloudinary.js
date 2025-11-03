const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'digitalhost_profiles',
    format: async (req, file) => 'png',
    public_id: (req, file) => `user-${req.user.id}`,
    transformation: [{ width: 250, height: 250, crop: 'limit' }]
  }
});

const upload = multer({ storage: storage });

module.exports = upload;
