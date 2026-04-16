const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

// Directory for uploads
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static('uploads'));

// Cloud DB Connection (Replace with your actual MongoDB URI)
mongoose.connect('mongodb://localhost:27017/haiViralGlobal')
    .then(() => console.log("Cloud Node Connected..."))
    .catch(err => console.error("Connection Error:", err));

// --- Database Schemas ---
const UserSchema = new mongoose.Schema({
    username: String,
    profilePic: { type: String, default: 'default.png' },
    plan: { type: String, default: 'Free' },
    balance: { type: Number, default: 0 }
});

const PostSchema = new mongoose.Schema({
    username: String,
    content: String,
    media: String,
    views: { type: Number, default: 0 },
    isViral: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);

// --- File Storage Logic ---
const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, "HAI_" + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- PUBLIC & USER ROUTES ---

app.post('/api/user/auth', async (req, res) => {
    let user = await User.findOne({ username: req.body.username });
    if (!user) user = await User.create({ username: req.body.username });
    res.json(user);
});

app.post('/api/post/share', upload.single('media'), async (req, res) => {
    const { username, content, plan } = req.body;
    let bonusViews = plan === 'Silver' ? 5000 : plan === 'Gold' ? 50000 : plan === 'Diamond' ? 1000000 : 0;
    
    const newPost = await Post.create({
        username, content,
        media: req.file ? req.file.filename : null,
        views: bonusViews + Math.floor(Math.random() * 500),
        isViral: plan !== 'Free'
    });
    res.json(newPost);
});

app.get('/api/feed', async (req, res) => {
    const feed = await Post.find().sort({ timestamp: -1 });
    res.json(feed);
});

// --- ADMIN CONTROL ROUTES ---

app.get('/api/admin/master-data', async (req, res) => {
    const posts = await Post.find().sort({ timestamp: -1 });
    const users = await User.countDocuments();
    res.json({ posts, users });
});

app.post('/api/admin/boost/:id', async (req, res) => {
    await Post.findByIdAndUpdate(req.params.id, { $inc: { views: 100000 }, isViral: true });
    res.json({ status: "Boosted" });
});

app.delete('/api/admin/delete/:id', async (req, res) => {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ status: "Deleted" });
});

const PORT = 8080;
app.listen(PORT, () => console.log(`HAI Server running on port ${PORT}`));
