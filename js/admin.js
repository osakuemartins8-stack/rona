// Admin Dashboard Logic
let adminSupabase = null;
let currentUser = null;
let allContent = [];
let selectedFile = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Supabase
    setTimeout(() => {
        if (typeof PortfolioConfig !== 'undefined') {
            adminSupabase = PortfolioConfig.getSupabase();
        } else if (window.supabase) {
            adminSupabase = window.supabase.createClient(
                'https://glnfhjudzdwetdloofvk.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbmZoanVkemR3ZXRkbG9vZnZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTE2MzcsImV4cCI6MjA4NTM2NzYzN30.74j2K1FprAH4C3d_H3b588RcRPj39EKtSV1UUskNOW0'
            );
        }
        
        if (adminSupabase) {
            console.log('Supabase initialized successfully');
            checkSession();
        } else {
            console.error('Failed to initialize Supabase');
            showError('Failed to connect to database. Please refresh.');
        }
    }, 100);
    
    setupDropZone();
});

// Auth Functions
async function checkSession() {
    try {
        const { data: { session }, error } = await adminSupabase.auth.getSession();
        
        if (session) {
            currentUser = session.user;
            // Verify admin status
            const { data: profile, error: profileError } = await adminSupabase
                .from('profiles')
                .select('is_admin')
                .eq('id', currentUser.id)
                .single();
                
            if (profileError || !profile?.is_admin) {
                await adminSupabase.auth.signOut();
                showLogin();
                showError('Admin access only');
            } else {
                showDashboard();
                loadContent();
            }
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Session check error:', error);
        showLogin();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    const btn = e.target.querySelector('button');
    
    if (!adminSupabase) {
        errorDiv.textContent = 'Database not connected. Please refresh.';
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Signing in...';
    errorDiv.textContent = '';
    
    try {
        const { data, error } = await adminSupabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        // Check if user is admin
        const { data: profile, error: profileError } = await adminSupabase
            .from('profiles')
            .select('is_admin')
            .eq('id', data.user.id)
            .single();
            
        if (profileError || !profile?.is_admin) {
            await adminSupabase.auth.signOut();
            throw new Error('Unauthorized: Admin access only');
        }
        
        currentUser = data.user;
        showDashboard();
        loadContent();
        
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = error.message || 'Login failed';
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

async function handleLogout() {
    try {
        await adminSupabase.auth.signOut();
        currentUser = null;
        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-email').textContent = currentUser?.email || '';
    const avatar = document.getElementById('user-avatar');
    if (avatar && currentUser?.email) {
        avatar.textContent = currentUser.email[0].toUpperCase();
    }
}

// Navigation
function showSection(section) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    // Show section
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');
}

// Content Management
async function loadContent() {
    if (!adminSupabase) return;
    
    try {
        const { data, error } = await adminSupabase
            .from('portfolio_content')
            .select('*')
            .order('order_index', { ascending: true });
            
        if (error) throw error;
        
        allContent = data || [];
        renderContentGrid(allContent);
        
    } catch (error) {
        console.error('Error loading content:', error);
        showError('Failed to load content');
    }
}

function renderContentGrid(content) {
    const grid = document.getElementById('content-grid');
    if (!grid) return;
    
    if (content.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">📭</div>
                <h3>No content yet</h3>
                <p>Start by adding your first video or image</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = content.map(item => {
        const thumbnail = item.thumbnail_url || getThumbnailUrl(item);
        const isActive = item.is_active;
        
        return `
            <div class="content-card" data-id="${item.id}">
                <div class="content-preview">
                    ${item.content_type === 'video' 
                        ? `<img src="${thumbnail}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/400x225?text=Video'" loading="lazy">`
                        : `<img src="${thumbnail}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/400x225?text=Image'" loading="lazy">`
                    }
                    <span class="content-type-badge">${item.content_type}</span>
                    ${!isActive ? '<span style="position: absolute; top: 0.75rem; left: 0.75rem; padding: 0.25rem 0.75rem; background: rgba(239, 68, 68, 0.9); border-radius: 20px; font-size: 0.75rem; font-weight: 600; color: white;">DRAFT</span>' : ''}
                </div>
                <div class="content-info">
                    <h3>${item.title}</h3>
                    <p>${item.description || 'No description'}</p>
                    <div class="content-meta">
                        <span>${new Date(item.created_at).toLocaleDateString()}</span>
                        <span class="status-badge ${isActive ? 'status-active' : 'status-inactive'}">
                            ${isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div class="content-actions">
                        <button class="btn-icon" onclick="editContent('${item.id}')" title="Edit">✏️</button>
                        <button class="btn-icon ${isActive ? '' : 'delete'}" onclick="toggleActive('${item.id}', ${!isActive})" title="${isActive ? 'Hide' : 'Show'}">
                            ${isActive ? '👁️' : '👁️‍🗨️'}
                        </button>
                        <button class="btn-icon delete" onclick="deleteContent('${item.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getThumbnailUrl(item) {
    if (item.content_type === 'video') {
        if (item.source_type === 'url' && item.url) {
            if (item.url.includes('youtube')) {
                const id = extractYouTubeId(item.url);
                return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : 'https://via.placeholder.com/400x225?text=Video';
            }
        }
        return 'https://via.placeholder.com/400x225?text=Video';
    } else {
        if (item.source_type === 'storage' && item.storage_path) {
            return `https://glnfhjudzdwetdloofvk.supabase.co/storage/v1/object/public/portfolio-media/${item.storage_path}`;
        }
        return item.url || 'https://via.placeholder.com/400x225?text=Image';
    }
}

function filterContent() {
    const type = document.getElementById('filter-type').value;
    const filtered = type === 'all' ? allContent : allContent.filter(item => item.content_type === type);
    renderContentGrid(filtered);
}

// Upload Functions
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'link') {
        document.getElementById('link-form').classList.remove('hidden');
        document.getElementById('file-form').classList.add('hidden');
    } else {
        document.getElementById('link-form').classList.add('hidden');
        document.getElementById('file-form').classList.remove('hidden');
    }
}

function toggleLinkPlaceholder() {
    const type = document.getElementById('link-type').value;
    const help = document.getElementById('link-help');
    const urlInput = document.getElementById('link-url');
    
    if (type === 'video') {
        help.textContent = 'Supports YouTube, Vimeo, or direct video links';
        urlInput.placeholder = 'https://youtube.com/watch?v=...';
    } else {
        help.textContent = 'Direct link to image (Imgur, Cloudinary, etc)';
        urlInput.placeholder = 'https://...';
    }
}

async function handleLinkSubmit(e) {
    e.preventDefault();
    if (!adminSupabase) {
        showError('Database not connected');
        return;
    }
    
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Adding...';
    
    try {
        const { data, error } = await adminSupabase
            .from('portfolio_content')
            .insert([
                {
                    title: document.getElementById('link-title').value,
                    description: document.getElementById('link-description').value,
                    content_type: document.getElementById('link-type').value,
                    source_type: 'url',
                    url: document.getElementById('link-url').value,
                    thumbnail_url: document.getElementById('link-thumbnail').value || null,
                    is_active: true
                }
            ]);
            
        if (error) throw error;
        
        showSuccess('Content added successfully!');
        e.target.reset();
        loadContent();
        showSection('content');
        
    } catch (error) {
        showError(error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Content';
    }
}

// File Upload
function setupDropZone() {
    const dropZone = document.getElementById('drop-zone');
    if (!dropZone) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = 'var(--accent)';
            dropZone.style.background = 'rgba(255, 143, 163, 0.05)';
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = 'var(--border)';
            dropZone.style.background = 'var(--primary-bg)';
        });
    });
    
    dropZone.addEventListener('drop', handleDrop);
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) handleFile(files[0]);
}

function handleFileSelect(e) {
    if (e.target.files.length) handleFile(e.target.files[0]);
}

function handleFile(file) {
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
        showError(`File too large. Max size: ${file.type.startsWith('video/') ? '50MB' : '10MB'}`);
        return;
    }
    
    selectedFile = file;
    const preview = document.getElementById('file-preview');
    if (!preview) return;
    
    preview.classList.remove('hidden');
    
    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        preview.innerHTML = '';
        preview.appendChild(img);
    } else {
        preview.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-size: 2rem;">🎥</span>
                <div>
                    <div style="font-weight: 600;">${file.name}</div>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
            </div>
        `;
    }
}

async function handleFileSubmit(e) {
    e.preventDefault();
    
    if (!adminSupabase) {
        showError('Database not connected');
        return;
    }
    
    if (!selectedFile) {
        showError('Please select a file');
        return;
    }
    
    const btn = document.getElementById('upload-btn');
    const btnText = btn.querySelector('.btn-text');
    const loading = btn.querySelector('.loading');
    
    btn.disabled = true;
    btnText.classList.add('hidden');
    loading.classList.remove('hidden');
    
    try {
        // Upload file to Supabase Storage
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${document.getElementById('file-type').value}s/${fileName}`;
        
        const { error: uploadError } = await adminSupabase.storage
            .from('portfolio-media')
            .upload(filePath, selectedFile);
            
        if (uploadError) throw uploadError;
        
        // Save to database
        const { error: dbError } = await adminSupabase
            .from('portfolio_content')
            .insert([
                {
                    title: document.getElementById('file-title').value,
                    description: document.getElementById('file-description').value,
                    content_type: document.getElementById('file-type').value,
                    source_type: 'storage',
                    storage_path: filePath,
                    is_active: true
                }
            ]);
            
        if (dbError) throw dbError;
        
        showSuccess('File uploaded successfully!');
        e.target.reset();
        selectedFile = null;
        document.getElementById('file-preview').classList.add('hidden');
        loadContent();
        showSection('content');
        
    } catch (error) {
        showError(error.message);
    } finally {
        btn.disabled = false;
        btnText.classList.remove('hidden');
        loading.classList.add('hidden');
    }
}

// Edit Functions
function editContent(id) {
    const item = allContent.find(c => c.id === id);
    if (!item) return;
    
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-title').value = item.title;
    document.getElementById('edit-description').value = item.description || '';
    document.getElementById('edit-order').value = item.order_index;
    document.getElementById('edit-active').checked = item.is_active;
    
    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

async function handleEditSubmit(e) {
    e.preventDefault();
    if (!adminSupabase) return;
    
    try {
        const { error } = await adminSupabase
            .from('portfolio_content')
            .update({
                title: document.getElementById('edit-title').value,
                description: document.getElementById('edit-description').value,
                order_index: parseInt(document.getElementById('edit-order').value),
                is_active: document.getElementById('edit-active').checked
            })
            .eq('id', document.getElementById('edit-id').value);
            
        if (error) throw error;
        
        closeModal();
        loadContent();
        showSuccess('Content updated successfully!');
        
    } catch (error) {
        showError(error.message);
    }
}

async function toggleActive(id, active) {
    if (!adminSupabase) return;
    
    try {
        const { error } = await adminSupabase
            .from('portfolio_content')
            .update({ is_active: active })
            .eq('id', id);
            
        if (error) throw error;
        loadContent();
        
    } catch (error) {
        showError(error.message);
    }
}

async function deleteContent(id) {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) return;
    if (!adminSupabase) return;
    
    try {
        // If it's a stored file, delete from storage too
        const item = allContent.find(c => c.id === id);
        if (item?.source_type === 'storage' && item.storage_path) {
            await adminSupabase.storage
                .from('portfolio-media')
                .remove([item.storage_path]);
        }
        
        const { error } = await adminSupabase
            .from('portfolio_content')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        loadContent();
        showSuccess('Content deleted successfully!');
        
    } catch (error) {
        showError(error.message);
    }
}

// Utilities
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    alert('Success: ' + message);
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('edit-modal');
    if (event.target === modal) {
        closeModal();
    }
}
