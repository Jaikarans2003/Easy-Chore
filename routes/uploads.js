const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('./auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../public/uploads');
const chorePhotosDir = path.join(uploadsDir, 'chore-photos');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(chorePhotosDir)) {
    fs.mkdirSync(chorePhotosDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const homeId = req.params.homeId;
        const homeDir = path.join(chorePhotosDir, homeId);
        
        if (!fs.existsSync(homeDir)) {
            fs.mkdirSync(homeDir, { recursive: true });
        }
        
        cb(null, homeDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with original extension
        const ext = path.extname(file.originalname);
        const filename = uuidv4() + ext;
        cb(null, filename);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

// Configure upload
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: fileFilter
});

// Upload chore photo
router.post('/chore-photos/:homeId', verifyToken, (req, res) => {
    const uploadMiddleware = upload.single('photo');
    
    uploadMiddleware(req, res, function (err) {
        if (err) {
            console.error('Upload error:', err);
            
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File size exceeds 5MB limit' });
            }
            
            return res.status(400).json({ message: err.message || 'Error uploading file' });
        }
        
        // No file uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        // Generate URL for the uploaded file
        const homeId = req.params.homeId;
        const filename = req.file.filename;
        const photoUrl = `/uploads/chore-photos/${homeId}/${filename}`;
        
        console.log('Photo uploaded successfully:', photoUrl);
        res.status(201).json({ photoUrl });
    });
});

// Export the router directly (not as an object)
module.exports = router; 