import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  File,
  Upload,
  LogOut,
  Lock,
  User,
  Plus,
  Eye,
  Download,
  CheckCircle,
  AlertCircle,
  Loader,
  FileText,
  Image as ImageIcon,
  Trash2,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [authState, setAuthState] = useState('login'); // 'login' | 'register' | 'forgot'

  // Registration & Login Fields
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('What is the name of your first pet?');
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Password Reset Specific Fields
  const [resetUsername, setResetUsername] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1: Enter Username, 2: Answer Question & Set New Password
  const [resetQuestion, setResetQuestion] = useState('');
  const [resetAnswer, setResetAnswer] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Dashboard State
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeDocUrl, setActiveDocUrl] = useState('');
  const [activeDocContent, setActiveDocContent] = useState(''); // for text files
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // UI States
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [folderToDelete, setFolderToDelete] = useState(null);

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileQuestion, setProfileQuestion] = useState('What is the name of your first pet?');
  const [profileAnswer, setProfileAnswer] = useState('');
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });


  // Show toast notification
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 4000);
  };

  // Fetch documents for the logged in user
  const fetchDocuments = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        if (response.status === 403 || response.status === 401) {
          handleLogout();
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  // Fetch folders for the logged in user
  const fetchFolders = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/folders`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  // Fetch Profile details
  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProfileName(data.name || '');
        setProfileQuestion(data.securityQuestion || 'What is the name of your first pet?');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    if (token && isProfileOpen) {
      fetchProfile();
    }
  }, [token, isProfileOpen]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileCurrentPassword) {
      showToast('Please enter your current password to save changes', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: profileCurrentPassword,
          name: profileName,
          securityQuestion: profileQuestion,
          securityAnswer: profileAnswer || undefined,
          newPassword: profileNewPassword || undefined
        })
      });

      const data = await response.json();
      if (response.ok) {
        setProfileMessage({ text: 'Profile updated successfully!', type: 'success' });
        setTimeout(() => setProfileMessage({ text: '', type: '' }), 4000);
        setProfileAnswer('');
        setProfileCurrentPassword('');
        setProfileNewPassword('');
        setIsProfileOpen(false);
        fetchProfile();
      } else {
        setProfileMessage({ text: data.message || 'Failed to update profile', type: 'error' });
        setTimeout(() => setProfileMessage({ text: '', type: '' }), 4000);
      }
    } catch (error) {
      console.error(error);
      setProfileMessage({ text: 'Error updating profile', type: 'error' });
      setTimeout(() => setProfileMessage({ text: '', type: '' }), 4000);
    }
  };

  const handleSaveProfileName = async () => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName
        })
      });

      const data = await response.json();
      if (response.ok) {
        setProfileMessage({ text: 'Profile updated successfully!', type: 'success' });
        setTimeout(() => setProfileMessage({ text: '', type: '' }), 4000);
        setIsEditingProfile(false);
        fetchProfile();
      } else {
        setProfileMessage({ text: data.message || 'Failed to update profile', type: 'error' });
        setTimeout(() => setProfileMessage({ text: '', type: '' }), 4000);
      }
    } catch (error) {
      console.error(error);
      setProfileMessage({ text: 'Error updating profile', type: 'error' });
      setTimeout(() => setProfileMessage({ text: '', type: '' }), 4000);
    }
  };


  useEffect(() => {
    if (token) {
      fetchDocuments(token);
      fetchFolders(token);
      fetchProfile();
    }
  }, [token]);

  // Load document preview content
  useEffect(() => {
    if (!activeDoc || !token) {
      setActiveDocUrl('');
      setActiveDocContent('');
      return;
    }

    const loadDocument = async () => {
      try {
        const response = await fetch(`${API_URL}/documents/${activeDoc.filename}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          showToast('Could not load file preview', 'error');
          return;
        }

        const blob = await response.blob();

        // Handle text files separately to display them inside a styled block
        if (activeDoc.mimetype.startsWith('text/') || activeDoc.originalname.endsWith('.json') || activeDoc.originalname.endsWith('.txt') || activeDoc.originalname.endsWith('.md')) {
          const text = await blob.text();
          setActiveDocContent(text);
          setActiveDocUrl('');
        } else {
          const objectUrl = URL.createObjectURL(blob);
          setActiveDocUrl(objectUrl);
          setActiveDocContent('');
        }
      } catch (error) {
        console.error('Error loading doc:', error);
        showToast('Error displaying document', 'error');
      }
    };

    loadDocument();
  }, [activeDoc, token]);

  // Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authUsername || !authPassword) {
      showToast('Please fill out all fields', 'error');
      return;
    }

    if (authState === 'register' && !securityAnswer) {
      showToast('Please fill out the security answer', 'error');
      return;
    }

    const endpoint = authState === 'login' ? '/login' : '/register';
    const payload = authState === 'login'
      ? { username: authUsername, password: authPassword }
      : { username: authUsername, password: authPassword, securityQuestion, securityAnswer, name: authName };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (authState === 'login') {
          localStorage.setItem('token', data.token);
          localStorage.setItem('username', data.username);
          setToken(data.token);
          setUsername(data.username);
          showToast(`Welcome back, ${data.username}!`, 'success');
        } else {
          showToast('Registration successful! Please login.', 'success');
          setAuthState('login');
        }
        setAuthUsername('');
        setAuthPassword('');
        setAuthName('');
        setSecurityAnswer('');
      } else {
        showToast(data.message || 'Authentication failed', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Server connection error', 'error');
    }
  };

  const handleFetchQuestion = async (e) => {
    e.preventDefault();
    if (!resetUsername) {
      showToast('Please enter your username', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/security-question/${resetUsername}`);
      const data = await response.json();

      if (response.ok) {
        setResetQuestion(data.securityQuestion);
        setResetStep(2);
      } else {
        showToast(data.message || 'Username not found', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Server connection error', 'error');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetAnswer || !resetNewPassword) {
      showToast('Please fill out all fields', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: resetUsername,
          securityAnswer: resetAnswer,
          newPassword: resetNewPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Password reset successful! You can now log in.', 'success');
        setAuthState('login');
        setResetUsername('');
        setResetAnswer('');
        setResetNewPassword('');
        setResetStep(1);
      } else {
        showToast(data.message || 'Verification failed', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Server connection error', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
    setUsername('');
    setDocuments([]);
    setFolders([]);
    setCurrentFolderId(null);
    setActiveDoc(null);
    showToast('Logged out successfully', 'success');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a file to upload', 'error');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', selectedFile);
    if (currentFolderId) {
      formData.append('folderId', currentFolderId);
    }

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        showToast('Document successfully uploaded & added to separate system', 'success');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchDocuments(token);
        // Automatically open the uploaded file
        setActiveDoc(data.document);
      } else {
        showToast(data.message || 'File upload failed', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Network error during upload', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      showToast('Please enter a folder name', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newFolderName.trim() })
      });

      const data = await response.json();
      if (response.ok) {
        showToast('Folder created successfully', 'success');
        setNewFolderName('');
        fetchFolders(token);
      } else {
        showToast(data.message || 'Failed to create folder', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Error creating folder', 'error');
    }
  };

  const handleDeleteFolderClick = (folder, e) => {
    e.stopPropagation();
    setFolderToDelete(folder);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    const folder = folderToDelete;
    setFolderToDelete(null);

    try {
      const response = await fetch(`${API_URL}/folders/${folder.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Folder deleted successfully', 'success');
        fetchFolders(token);
        fetchDocuments(token);
        if (currentFolderId === folder.id) {
          setCurrentFolderId(null);
        }
      } else {
        const data = await response.json();
        showToast(data.message || 'Failed to delete folder', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Error deleting folder', 'error');
    }
  };

  const handleDeleteDocClick = (doc, e) => {
    e.stopPropagation();
    setDocToDelete(doc);
  };

  const handleConfirmDeleteDoc = async () => {
    if (!docToDelete) return;
    const doc = docToDelete;
    setDocToDelete(null);

    try {
      const response = await fetch(`${API_URL}/documents/${doc.filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Document deleted successfully', 'success');
        if (activeDoc && activeDoc.filename === doc.filename) {
          setActiveDoc(null);
        }
        fetchDocuments(token);
      } else {
        const data = await response.json();
        showToast(data.message || 'Failed to delete document', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Error deleting document', 'error');
    }
  };

  // Helper to determine the best file icon
  const getFileIcon = (mimetype, filename) => {
    if (mimetype.startsWith('image/')) return <ImageIcon className="doc-icon" />;
    return <FileText className="doc-icon" />;
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>

      {/* Toast Alert */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {isProfileOpen && (
        <div className="dialog-overlay" onClick={() => { setIsProfileOpen(false); setIsEditingProfile(false); setProfileMessage({ text: '', type: '' }); }}>
          <div className="glass-panel dialog-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', textAlign: 'left', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="panel-title" style={{ margin: 0, paddingBottom: 0, border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} style={{ color: 'var(--color-primary-light)' }} />
                <span>User Profile Details</span>
              </h3>
              <button
                onClick={() => { setIsProfileOpen(false); setIsEditingProfile(false); setProfileMessage({ text: '', type: '' }); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Username</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>{username}</div>
              </div>

              {profileMessage.text && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: profileMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: profileMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                  color: profileMessage.type === 'success' ? 'var(--color-accent)' : '#ef4444'
                }}>
                  {profileMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 600 }}>User Name</label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      className="form-input"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)' }}
                      placeholder="Enter user name"
                    />
                  ) : (
                    <div style={{ fontSize: '1rem', color: 'var(--text-main)', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {profileName || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not Provided</span>}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 600 }}>Security Question</label>
                  <div style={{ fontSize: '1rem', color: 'var(--text-main)', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)', lineHeight: '1.4' }}>
                    {profileQuestion}
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }}></div>

              <div className="dialog-buttons" style={{ justifyContent: 'flex-end', gap: '12px' }}>
                {isEditingProfile ? (
                  <>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSaveProfileName}
                      style={{ width: 'auto', padding: '10px 24px', marginTop: 0 }}
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setIsEditingProfile(false);
                        fetchProfile();
                      }}
                      style={{ width: 'auto', padding: '10px 24px' }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsEditingProfile(true)}
                      style={{ width: 'auto', padding: '10px 24px' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsEditingProfile(false);
                        setProfileMessage({ text: '', type: '' });
                      }}
                      style={{ width: 'auto', padding: '10px 24px', marginTop: 0 }}
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {docToDelete && (
        <div className="dialog-overlay" onClick={() => setDocToDelete(null)}>
          <div className="glass-panel dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon-wrapper">
              <AlertCircle size={32} />
            </div>
            <p className="dialog-warning-text">
              Are you sure you want to delete {docToDelete.originalname}?
            </p>
            <div className="dialog-buttons">
              <button className="btn-dialog-yes" onClick={handleConfirmDeleteDoc}>
                Yes
              </button>
              <button className="btn-dialog-no" onClick={() => setDocToDelete(null)}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Folder Delete Confirmation Modal */}
      {folderToDelete && (
        <div className="dialog-overlay" onClick={() => setFolderToDelete(null)}>
          <div className="glass-panel dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon-wrapper">
              <AlertCircle size={32} />
            </div>
            <p className="dialog-warning-text">
              Are you sure you want to delete folder "{folderToDelete.name}"? This will also delete all files stored inside it.
            </p>
            <div className="dialog-buttons">
              <button className="btn-dialog-yes" onClick={handleConfirmDeleteFolder}>
                Yes
              </button>
              <button className="btn-dialog-no" onClick={() => setFolderToDelete(null)}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Screen */}
      {!token ? (
        <div className="auth-wrapper">
          <div className="glass-panel auth-card">
            <div className="brand-header">
              <span className="brand-logo">DocuSafe</span>
              <p className="brand-tagline">Secure Document Storage System</p>
            </div>

            {authState !== 'forgot' ? (
              <form onSubmit={handleAuthSubmit}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter your username"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      style={{ width: '100%', paddingLeft: '40px' }}
                    />
                    <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      style={{ width: '100%', paddingLeft: '40px' }}
                    />
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                {authState === 'register' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Full Name (Optional)</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Enter your name"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          style={{ width: '100%', paddingLeft: '40px' }}
                        />
                        <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Security Question</label>
                      <select
                        className="form-input"
                        value={securityQuestion}
                        onChange={(e) => setSecurityQuestion(e.target.value)}
                        style={{ width: '100%', background: '#1e293b' }}
                      >
                        <option value="What is the name of your first pet?">What is the name of your first pet?</option>
                        <option value="In what city were you born?">In what city were you born?</option>
                        <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                        <option value="What was your first car?">What was your first car?</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Security Answer</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Answer"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </>
                )}

                <button type="submit" className="btn-primary">
                  {authState === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            ) : (
              /* Forgot Password Forms */
              resetStep === 1 ? (
                <form onSubmit={handleFetchQuestion}>
                  <div className="form-group">
                    <label className="form-label">Enter Username</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Your username"
                        value={resetUsername}
                        onChange={(e) => setResetUsername(e.target.value)}
                        style={{ width: '100%', paddingLeft: '40px' }}
                      />
                      <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary">Continue</button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit}>
                  <div className="form-group">
                    <label className="form-label">Security Question</label>
                    <p style={{ fontSize: '0.95rem', color: 'var(--color-primary-light)', margin: '4px 0 12px' }}>{resetQuestion}</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Your Answer</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter security answer"
                      value={resetAnswer}
                      onChange={(e) => setResetAnswer(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="••••••••"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        style={{ width: '100%', paddingLeft: '40px' }}
                      />
                      <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary">Reset Password</button>
                </form>
              )
            )}

            <div className="auth-switch" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px' }}>
              {authState === 'login' ? (
                <>
                  <div>
                    Don't have an account?{' '}
                    <span className="auth-switch-link" onClick={() => setAuthState('register')}>
                      Register here
                    </span>
                  </div>
                  <div>
                    <span className="auth-switch-link" style={{ fontSize: '0.85rem' }} onClick={() => setAuthState('forgot')}>
                      Forgot Password?
                    </span>
                  </div>
                </>
              ) : authState === 'register' ? (
                <div>
                  Already have an account?{' '}
                  <span className="auth-switch-link" onClick={() => setAuthState('login')}>
                    Sign In
                  </span>
                </div>
              ) : (
                <div>
                  <span className="auth-switch-link" onClick={() => { setAuthState('login'); setResetStep(1); }}>
                    Back to Login
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Dashboard Screen */
        <div className="dashboard-container">
          <header className="glass-panel dash-header">
            <div className="user-badge" onClick={() => setIsProfileOpen(true)} style={{ cursor: 'pointer' }} title="Edit Profile">
              <div className="user-avatar">{username.substring(0, 2).toUpperCase()}</div>
              <div>
                <h4 className="username-display">{profileName || username}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{profileName ? `@${username} • ` : ''}Security Clearance Active</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="brand-logo" style={{ fontSize: '1.5rem', marginBottom: 0 }}>DocuSafe</span>
              <button onClick={handleLogout} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </header>

          <main className="dash-grid">
            {/* Sidebar (Upload + List) */}
            <div className="sidebar-panel">
              {/* Document List Module */}
              <div className="glass-panel list-card">
                <h3 className="panel-title">
                  <Folder size={18} style={{ color: 'var(--color-secondary-light)' }} />
                  <span>
                    {currentFolderId
                      ? `Folder: ${folders.find(f => f.id === currentFolderId)?.name || 'Unknown'}`
                      : 'Your Documents'}
                  </span>
                </h3>

                {/* Folder Navigation / Breadcrumbs */}
                {currentFolderId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <button
                      onClick={() => setCurrentFolderId(null)}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      ← Back to Root
                    </button>
                  </div>
                )}

                {/* Create Folder Form (Only at Root level) */}
                {!currentFolderId && (
                  <form onSubmit={handleCreateFolder} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="New folder name..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem' }}
                    />
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                    >
                      <Plus size={16} />
                      <span>Folder</span>
                    </button>
                  </form>
                )}

                <div className="document-list-scroll">
                  {/* Render Folders (only at Root level) */}
                  {!currentFolderId && folders.map(folder => (
                    <div
                      key={folder.id}
                      className="document-item folder-item"
                      onClick={() => setCurrentFolderId(folder.id)}
                      style={{ borderLeft: '3px solid var(--color-secondary-light)', cursor: 'pointer' }}
                    >
                      <div className="doc-info" style={{ flex: 1, minWidth: 0 }}>
                        <Folder className="doc-icon" style={{ color: 'var(--color-secondary-light)' }} />
                        <div className="doc-details">
                          <span className="doc-name" style={{ fontWeight: '600' }}>{folder.name}</span>
                          <span className="doc-meta">
                            {documents.filter(d => d.folderId === folder.id).length} files
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={(e) => handleDeleteFolderClick(folder, e)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7, padding: '4px' }}
                          title="Delete Folder"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Render Documents in current folder view */}
                  {(() => {
                    const filteredDocs = documents.filter(doc =>
                      currentFolderId ? doc.folderId === currentFolderId : !doc.folderId
                    );

                    if (filteredDocs.length === 0 && (currentFolderId || folders.length === 0)) {
                      return (
                        <div className="empty-state">
                          <p>No documents in this location.</p>
                          <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>Upload a file below to add it here.</p>
                        </div>
                      );
                    }

                    return filteredDocs.map(doc => (
                      <div
                        key={doc.id}
                        className={`document-item ${activeDoc?.id === doc.id ? 'active' : ''}`}
                        onClick={() => setActiveDoc(doc)}
                      >
                        <div className="doc-info" style={{ flex: 1, minWidth: 0 }}>
                          {getFileIcon(doc.mimetype, doc.originalname)}
                          <div className="doc-details">
                            <span className="doc-name">{doc.originalname}</span>
                            <span className="doc-meta">
                              {(doc.size / 1024).toFixed(1)} KB • {new Date(doc.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <Eye size={16} style={{ opacity: activeDoc?.id === doc.id ? 1 : 0.4, color: activeDoc?.id === doc.id ? 'var(--color-primary-light)' : 'inherit' }} />
                          <button
                            onClick={(e) => handleDeleteDocClick(doc, e)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7, padding: '4px' }}
                            title="Delete Document"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Upload Module */}
              <div className="glass-panel upload-card">
                <h3 className="panel-title">
                  <Upload size={18} style={{ color: 'var(--color-primary-light)' }} />
                  <span>Upload Document</span>
                </h3>
                <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="dropzone" onClick={() => fileInputRef.current.click()}>
                    <Upload size={32} className="dropzone-icon" />
                    <span className="dropzone-text">Click to choose a file from your system</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {selectedFile && (
                    <div className="file-selected-info">
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                        {selectedFile.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isUploading}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isUploading ? 0.7 : 1 }}
                  >
                    {isUploading ? (
                      <>
                        <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        <span>Add Document</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Document Viewer Module */}
            <div className="glass-panel viewer-panel">
              <div className="viewer-header">
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Eye size={18} style={{ color: 'var(--color-accent)' }} />
                    <span>In-App Previewer</span>
                  </h3>
                  {activeDoc && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Currently viewing: <strong style={{ color: 'var(--text-main)' }}>{activeDoc.originalname}</strong>
                    </p>
                  )}
                </div>
                {activeDoc && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {activeDocUrl && (
                      <a
                        href={activeDocUrl}
                        download={activeDoc.originalname}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </a>
                    )}
                    <button
                      onClick={() => setIsFullscreen(true)}
                      className="btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px' }}
                      title="Fullscreen Preview"
                    >
                      <Maximize2 size={14} />
                      <span>Fullscreen</span>
                    </button>
                    <button
                      onClick={() => setActiveDoc(null)}
                      className="btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px' }}
                      title="Close Preview"
                    >
                      <X size={14} />
                      <span>Close</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="viewer-body">
                {!activeDoc ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    <File size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
                    <h3>No Document Selected</h3>
                    <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>Choose a document from the sidebar list to preview it here.</p>
                  </div>
                ) : activeDoc.mimetype.startsWith('image/') ? (
                  <img src={activeDocUrl} alt={activeDoc.originalname} className="viewer-image" />
                ) : activeDoc.mimetype === 'application/pdf' ? (
                  <iframe src={activeDocUrl} title={activeDoc.originalname} className="viewer-iframe" />
                ) : activeDocContent ? (
                  <pre className="viewer-text">{activeDocContent}</pre>
                ) : (
                  <div className="viewer-generic">
                    <FileText size={48} style={{ color: 'var(--color-primary-light)', marginBottom: '12px' }} />
                    <h4>Preview Not Available</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      This file format cannot be rendered directly in-app.
                    </p>
                    <a href={activeDocUrl} download={activeDoc.originalname} className="viewer-generic-btn">
                      Download file to open
                    </a>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      )}
      {/* Fullscreen Overlay Portal */}
      {isFullscreen && activeDoc && (
        <div className="fullscreen-viewer">
          <div className="viewer-header">
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={22} style={{ color: 'var(--color-accent)' }} />
                <span>Fullscreen Preview</span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Viewing: <strong style={{ color: 'var(--text-main)' }}>{activeDoc.originalname}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {activeDocUrl && (
                <a
                  href={activeDocUrl}
                  download={activeDoc.originalname}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>
              )}
              <button
                onClick={() => setIsFullscreen(false)}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px' }}
                title="Exit Fullscreen"
              >
                <Minimize2 size={14} />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>

          <div className="viewer-body">
            {activeDoc.mimetype.startsWith('image/') ? (
              <img src={activeDocUrl} alt={activeDoc.originalname} className="viewer-image" />
            ) : activeDoc.mimetype === 'application/pdf' ? (
              <iframe src={activeDocUrl} title={activeDoc.originalname} className="viewer-iframe" />
            ) : activeDocContent ? (
              <pre className="viewer-text">{activeDocContent}</pre>
            ) : (
              <div className="viewer-generic">
                <FileText size={48} style={{ color: 'var(--color-primary-light)', marginBottom: '12px' }} />
                <h4>Preview Not Available</h4>
                <a href={activeDocUrl} download={activeDoc.originalname} className="viewer-generic-btn">
                  Download file to open
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
