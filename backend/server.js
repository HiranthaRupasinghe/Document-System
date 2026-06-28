require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this-in-production';

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// JSON File Database Configuration
const USERS_FILE = path.join(__dirname, 'users.json');
const USERS_BACKUP_FILE = path.join(__dirname, 'separate_system_storage', '.users_backup.json');
const DOCUMENTS_FILE = path.join(__dirname, 'documents.json');
const FOLDERS_FILE = path.join(__dirname, 'folders.json');

const loadData = (filePath) => {
  try {
    if (filePath === USERS_FILE) {
      let mainUsers = [];
      try {
        if (fs.existsSync(USERS_FILE)) {
          const content = fs.readFileSync(USERS_FILE, 'utf8');
          mainUsers = JSON.parse(content) || [];
        }
      } catch (err) {
        console.error('Error parsing USERS_FILE', err);
      }

      let backupUsers = [];
      try {
        if (fs.existsSync(USERS_BACKUP_FILE)) {
          const content = fs.readFileSync(USERS_BACKUP_FILE, 'utf8');
          backupUsers = JSON.parse(content) || [];
        }
      } catch (err) {
        console.error('Error parsing USERS_BACKUP_FILE', err);
      }

      const mergedUsers = [...mainUsers];
      let updated = false;
      for (const bUser of backupUsers) {
        if (!mergedUsers.some(u => u.username === bUser.username)) {
          mergedUsers.push(bUser);
          updated = true;
        }
      }

      if (updated || !fs.existsSync(USERS_FILE)) {
        const dir = path.dirname(USERS_BACKUP_FILE);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(USERS_FILE, JSON.stringify(mergedUsers, null, 2), 'utf8');
      }
      return mergedUsers;
    }

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error);
  }
  return [];
};

const saveData = (filePath, data) => {
  try {
    if (filePath === USERS_FILE) {
      const existingUsers = loadData(USERS_FILE);
      for (const existingUser of existingUsers) {
        if (!data.some(u => u.username === existingUser.username)) {
          throw new Error(`Deletion of user ${existingUser.username} is prohibited.`);
        }
      }
      fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
      const dir = path.dirname(USERS_BACKUP_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(USERS_BACKUP_FILE, JSON.stringify(data, null, 2), 'utf8');
      return;
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
  }
};

const users = loadData(USERS_FILE);
const documents = loadData(DOCUMENTS_FILE); // Schema: { id, filename, originalname, mimetype, size, username, uploadedAt, folderId }
const folders = loadData(FOLDERS_FILE); // Schema: { id, name, username, createdAt }

// Ensure separate storage directory exists
const storageDir = path.join(__dirname, 'separate_system_storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Multer storage configuration - save files directly in separate_system_storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename prefix to avoid collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// 1. User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, securityQuestion, securityAnswer, name } = req.body;
    if (!username || !password || !securityQuestion || !securityAnswer) {
      return res.status(400).json({ message: 'Username, password, security question, and answer are required' });
    }

    if (users.find(u => u.username === username)) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Hash security answer for privacy/security
    const hashedAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10);

    const newUser = {
      username,
      password: hashedPassword,
      securityQuestion,
      securityAnswer: hashedAnswer,
      name: name || ''
    };
    users.push(newUser);
    saveData(USERS_FILE, users);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// 1b. Fetch User's Security Question
app.get('/api/security-question/:username', (req, res) => {
  const { username } = req.params;
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({ securityQuestion: user.securityQuestion });
});

// 1c. Reset Password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { username, securityAnswer, newPassword } = req.body;
    if (!username || !securityAnswer || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify security answer
    const isAnswerCorrect = await bcrypt.compare(securityAnswer.toLowerCase().trim(), user.securityAnswer);
    if (!isAnswerCorrect) {
      return res.status(400).json({ message: 'Incorrect answer to security question' });
    }

    // Hash and update the new password
    user.password = await bcrypt.hash(newPassword, 10);
    saveData(USERS_FILE, users);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Password reset failed' });
  }
});

// Helper to check if a request originates from the server machine itself
const isLocalRequest = (req) => {
  const incomingIp = req.ip || req.socket.remoteAddress;
  if (!incomingIp) return false;
  if (incomingIp === '127.0.0.1' || incomingIp === '::1' || incomingIp === '::ffff:127.0.0.1') {
    return true;
  }
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.address === incomingIp) {
          return true;
        }
      }
    }
  } catch (err) {
    console.error('Error reading network interfaces:', err);
  }
  return false;
};

// 2. User Login
app.post('/api/login', async (req, res) => {
  try {
    if (!isLocalRequest(req)) {
      return res.status(403).json({ message: 'Login is only permitted from the server machine itself' });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// 3. Document Upload
app.post('/api/upload', authenticateToken, upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const docMetadata = {
      id: Date.now().toString(),
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      username: req.user.username,
      uploadedAt: new Date().toISOString(),
      folderId: req.body.folderId || null
    };

    documents.push(docMetadata);
    saveData(DOCUMENTS_FILE, documents);
    res.status(201).json({ message: 'Document added to separate system', document: docMetadata });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// 3b. Create Folder
app.post('/api/folders', authenticateToken, (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }
    const newFolder = {
      id: Date.now().toString(),
      name,
      username: req.user.username,
      createdAt: new Date().toISOString()
    };
    folders.push(newFolder);
    saveData(FOLDERS_FILE, folders);
    res.status(201).json({ message: 'Folder created successfully', folder: newFolder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create folder' });
  }
});

// 3c. Get Folders list for the logged-in user
app.get('/api/folders', authenticateToken, (req, res) => {
  const userFolders = folders.filter(f => f.username === req.user.username);
  res.json(userFolders);
});

// 3d. Delete Folder (and all documents inside it)
app.delete('/api/folders/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const folderIndex = folders.findIndex(f => f.id === id && f.username === req.user.username);
    if (folderIndex === -1) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Delete all files inside the folder from disk and metadata
    const docsInFolder = documents.filter(d => d.folderId === id && d.username === req.user.username);
    for (const doc of docsInFolder) {
      const filePath = path.join(storageDir, doc.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      const docIndex = documents.findIndex(d => d.id === doc.id);
      if (docIndex !== -1) {
        documents.splice(docIndex, 1);
      }
    }
    saveData(DOCUMENTS_FILE, documents);

    // Remove the folder
    folders.splice(folderIndex, 1);
    saveData(FOLDERS_FILE, folders);

    res.json({ message: 'Folder and its contents deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete folder' });
  }
});

// 4. Get Documents list for the logged-in user
app.get('/api/documents', authenticateToken, (req, res) => {
  const userDocs = documents.filter(doc => doc.username === req.user.username);
  res.json(userDocs);
});

// 5. Open/Get Specific Document Content
app.get('/api/documents/:filename', authenticateToken, (req, res) => {
  const { filename } = req.params;
  const doc = documents.find(d => d.filename === filename && d.username === req.user.username);

  if (!doc) {
    return res.status(404).json({ message: 'Document not found' });
  }

  const filePath = path.join(storageDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File file does not exist on disk' });
  }

  res.setHeader('Content-Type', doc.mimetype);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalname)}"`);
  res.sendFile(filePath);
});

// 6. Delete Document
app.delete('/api/documents/:filename', authenticateToken, (req, res) => {
  try {
    const { filename } = req.params;
    const docIndex = documents.findIndex(d => d.filename === filename && d.username === req.user.username);

    if (docIndex === -1) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const doc = documents[docIndex];
    const filePath = path.join(storageDir, filename);

    // Delete from disk if file exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from in-memory array
    documents.splice(docIndex, 1);
    saveData(DOCUMENTS_FILE, documents);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

// 7. Get User Profile Details
app.get('/api/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.username === req.user.username);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({
    username: user.username,
    name: user.name || '',
    securityQuestion: user.securityQuestion
  });
});

// 8. Update User Profile Details
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, securityQuestion, securityAnswer, newPassword, name } = req.body;

    const user = users.find(u => u.username === req.user.username);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password if changing security details
    if (securityQuestion || securityAnswer || newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to verify changes' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect current password' });
      }
    }

    // Update name if provided
    if (typeof name === 'string') {
      user.name = name;
    }

    // Update security question if provided
    if (securityQuestion) {
      user.securityQuestion = securityQuestion;
    }

    // Update security answer if provided
    if (securityAnswer) {
      user.securityAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10);
    }

    // Update password if provided
    if (newPassword) {
      user.password = await bcrypt.hash(newPassword, 10);
    }

    saveData(USERS_FILE, users);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

