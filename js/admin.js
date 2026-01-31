// Admin Dashboard - Complete JavaScript
// Manages: Content, Uploads, Site Settings, CV, and Profile

let adminSupabase = null;
let currentUser = null;
let allContent = [];
let selectedFile = null;

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Supabase with delay to ensure library is loaded
    setTimeout(() => {
        initializeSupabase();
    }, 500);
    
    setupDropZone();
});

function initializeSupabase() {
    try {
        // Try to get from global config first
        if (typeof PortfolioConfig !== 'undefined' && PortfolioConfig.getSupabase) {
            adminSupabase = PortfolioConfig.getSupabase();
        } 
        // Fallback: create directly
        else if (window.supabase) {
            adminSupabase = window.supabase.createClient(
                'https://glnfhjudzdwetdloofvk.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbmZoanVkemR3ZXRkbG9vZnZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTE2MzcsImV4cCI6MjA4NTM2NzYzN30.74j2K1FprAH4C3d_H3b588RcRPj39EKtSV1UUskNOW0'
            );
        }

        if (adminSupabase) {
            console.log('✅ Supabase initialized');
            checkSession();
        } else {
            console.error('❌ Failed to initialize Supabase');
            document.getElementById('login-error').textContent = 'Failed to connect to database. Check console.';
        }
    } catch (error) {
        console.error('Supabase init error:', error);
    }
}

// ==========================================
// AUTHENTICATION
// ==========================================

async function checkSession() {
    try {
        const { data: { session }, error } = await adminSupabase.auth.getSession();
        
        if (error) throw error;
        
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
                if (profileError) showError('Admin access required');
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
        errorDiv.textContent = 'Database not ready. Please wait...';
        return;
    }
    
    // Show loading
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Signing in...';
    errorDiv.textContent = '';
    
    try {
        const { data, error } = await adminSupabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        // Check admin status
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
    
    if (currentUser) {
        document.getElementById('user-email').textContent = currentUser.email;
        const avatar = document.getElementById('user-avatar');
        if (avatar) avatar.textContent = currentUser.email[0].toUpperCase();
    }
}

// ==========================================
// NAVIGATION
// ==========================================

function showSection(section, element) {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    if (element) element.classList.add('active');
    
    // Show/hide sections
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) targetSection.classList.add('active');
    
    // Update page title
    const titles = {
        'content': 'Content Management',
        'upload': 'Add New Content',
        'profile': 'Edit Homepage',
        'cv': 'Edit CV & Experience'
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl && titles[section]) titleEl.textContent = titles[section];
    
    // Load data for specific sections
    if (section === 'profile') {
        setTimeout(loadSiteSettingsIntoForm, 100);
    } else if (section === 'cv') {
        setTimeout(loadCVData, 100);
    }
}

// ==========================================
// CONTENT MANAGEMENT (VIDEOS/IMAGES)
// ==========================================

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
        renderContentGrid([]);
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
                <p>Click "Add New" to upload your first video or image</p>
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
            if (item.url.includes('youtube') || item.url.includes('youtu.be')) {
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

// ==========================================
// UPLOAD FUNCTIONS
// ==========================================

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

function previewLink() {
    const url = document.getElementById('link-url').value;
    const thumbInput = document.getElementById('link-thumbnail');
    
    if ((url.includes('youtube') || url.includes('youtu.be')) && !thumbInput.value) {
        const id = extractYouTubeId(url);
        if (id) {
            thumbInput.placeholder = `Auto: https://img.youtube.com/vi/${id}/mqdefault.jpg`;
        }
    }
}

async function handleLinkSubmit(e) {
    e.preventDefault();
    if (!adminSupabase) {
        showError('Database not connected');
        return;
    }
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Adding...';
    
    try {
        // Auto-generate thumbnail for YouTube if not provided
        let thumbnail = document.getElementById('link-thumbnail').value;
        const url = document.getElementById('link-url').value;
        
        if (!thumbnail && url.includes('youtube')) {
            const id = extractYouTubeId(url);
            if (id) thumbnail = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
        }
        
        const { error } = await adminSupabase
            .from('portfolio_content')
            .insert([{
                title: document.getElementById('link-title').value,
                description: document.getElementById('link-description').value,
                content_type: document.getElementById('link-type').value,
                source_type: 'url',
                url: url,
                thumbnail_url: thumbnail || null,
                is_active: true,
                order_index: 0
            }]);
            
        if (error) throw error;
        
        showSuccess('✅ Content added successfully!');
        e.target.reset();
        loadContent();
        showSection('content', document.querySelectorAll('.nav-item')[0]);
        
    } catch (error) {
        showError(error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// File Upload Handling
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
    const contentDiv = document.getElementById('preview-content');
    
    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.maxHeight = '200px';
        img.style.objectFit = 'cover';
        contentDiv.innerHTML = '';
        contentDiv.appendChild(img);
    } else {
        contentDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem;">
                <span style="font-size: 2.5rem;">🎥</span>
                <div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">${file.name}</div>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
            </div>
        `;
    }
}

function clearFile() {
    selectedFile = null;
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview').classList.add('hidden');
}

function updateFileAccept() {
    const type = document.getElementById('file-type').value;
    const input = document.getElementById('file-input');
    input.accept = type === 'video' ? 'video/*' : 'image/*';
}

async function handleFileSubmit(e) {
    e.preventDefault();
    
    if (!adminSupabase) {
        showError('Database not connected');
        return;
    }
    
    if (!selectedFile) {
        showError('Please select a file first');
        return;
    }
    
    const btn = document.getElementById('upload-btn');
    const btnText = btn.querySelector('.btn-text');
    const loading = btn.querySelector('.loading');
    
    btn.disabled = true;
    btnText.classList.add('hidden');
    loading.classList.remove('hidden');
    
    try {
        // Upload to Storage
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${document.getElementById('file-type').value}s/${fileName}`;
        
        const { error: uploadError } = await adminSupabase.storage
            .from('portfolio-media')
            .upload(filePath, selectedFile);
            
        if (uploadError) throw uploadError;
        
        // Save to Database
        const { error: dbError } = await adminSupabase
            .from('portfolio_content')
            .insert([{
                title: document.getElementById('file-title').value,
                description: document.getElementById('file-description').value,
                content_type: document.getElementById('file-type').value,
                source_type: 'storage',
                storage_path: filePath,
                is_active: true,
                order_index: 0
            }]);
            
        if (dbError) throw dbError;
        
        showSuccess('✅ File uploaded successfully!');
        e.target.reset();
        selectedFile = null;
        document.getElementById('file-preview').classList.add('hidden');
        loadContent();
        showSection('content', document.querySelectorAll('.nav-item')[0]);
        
    } catch (error) {
        showError(error.message);
    } finally {
        btn.disabled = false;
        btnText.classList.remove('hidden');
        loading.classList.add('hidden');
    }
}

// ==========================================
// EDIT/DELETE OPERATIONS
// ==========================================

function editContent(id) {
    const item = allContent.find(c => c.id === id);
    if (!item) return;
    
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-title').value = item.title;
    document.getElementById('edit-description').value = item.description || '';
    document.getElementById('edit-order').value = item.order_index || 0;
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
                is_active: document.getElementById('edit-active').checked,
                updated_at: new Date()
            })
            .eq('id', document.getElementById('edit-id').value);
            
        if (error) throw error;
        
        closeModal();
        loadContent();
        showSuccess('✅ Content updated!');
        
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
    if (!confirm('⚠️ Are you sure you want to delete this? This action cannot be undone.')) return;
    if (!adminSupabase) return;
    
    try {
        const item = allContent.find(c => c.id === id);
        
        // Delete from storage if it's a file
        if (item?.source_type === 'storage' && item.storage_path) {
            await adminSupabase.storage
                .from('portfolio-media')
                .remove([item.storage_path]);
        }
        
        // Delete from database
        const { error } = await adminSupabase
            .from('portfolio_content')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        loadContent();
        showSuccess('✅ Content deleted');
        
    } catch (error) {
        showError(error.message);
    }
}

// ==========================================
// SITE EDITOR (HOMEPAGE CONTENT)
// ==========================================

async function loadSiteSettingsIntoForm() {
    if (!adminSupabase) return;
    
    try {
        const { data, error } = await adminSupabase
            .from('site_settings')
            .select('*');
            
        if (error) throw error;
        
        // Mapping of DB fields to form fields
        const fieldMap = {
            'hero-headline': 'site-hero-headline',
            'hero-subtitle': 'site-hero-subtitle',
            'hero-cta_primary': 'site-hero-cta1',
            'hero-cta_secondary': 'site-hero-cta2',
            'about-profile_image': 'site-about-image',
            'about-lead_text': 'site-about-lead',
            'about-bio_text': 'site-about-bio',
            'stats-campaigns': 'site-stat-1',
            'stats-campaigns_label': 'site-stat-1-label',
            'stats-views': 'site-stat-2',
            'stats-views_label': 'site-stat-2-label',
            'stats-experience': 'site-stat-3',
            'stats-experience_label': 'site-stat-3-label',
            'social-instagram': 'site-social-insta',
            'social-tiktok': 'site-social-tiktok',
            'social-linkedin': 'site-social-linkedin',
            'social-email': 'site-social-email',
            'contact-headline': 'site-contact-headline',
            'contact-subtext': 'site-contact-subtext',
            'footer-copyright': 'site-footer-copy'
        };
        
        data.forEach(item => {
            const fieldId = fieldMap[`${item.section}-${item.key}`];
            if (fieldId) {
                const field = document.getElementById(fieldId);
                if (field && item.value) field.value = item.value;
            }
        });
        
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveAllSiteSettings() {
    if (!adminSupabase) {
        showError('Not connected to database');
        return;
    }
    
    const settings = [
        { section: 'hero', key: 'headline', value: document.getElementById('site-hero-headline').value },
        { section: 'hero', key: 'subtitle', value: document.getElementById('site-hero-subtitle').value },
        { section: 'hero', key: 'cta_primary', value: document.getElementById('site-hero-cta1').value },
        { section: 'hero', key: 'cta_secondary', value: document.getElementById('site-hero-cta2').value },
        { section: 'about', key: 'profile_image', value: document.getElementById('site-about-image').value },
        { section: 'about', key: 'lead_text', value: document.getElementById('site-about-lead').value },
        { section: 'about', key: 'bio_text', value: document.getElementById('site-about-bio').value },
        { section: 'stats', key: 'campaigns', value: document.getElementById('site-stat-1').value },
        { section: 'stats', key: 'campaigns_label', value: document.getElementById('site-stat-1-label').value },
        { section: 'stats', key: 'views', value: document.getElementById('site-stat-2').value },
        { section: 'stats', key: 'views_label', value: document.getElementById('site-stat-2-label').value },
        { section: 'stats', key: 'experience', value: document.getElementById('site-stat-3').value },
        { section: 'stats', key: 'experience_label', value: document.getElementById('site-stat-3-label').value },
        { section: 'social', key: 'instagram', value: document.getElementById('site-social-insta').value },
        { section: 'social', key: 'tiktok', value: document.getElementById('site-social-tiktok').value },
        { section: 'social', key: 'linkedin', value: document.getElementById('site-social-linkedin').value },
        { section: 'social', key: 'email', value: document.getElementById('site-social-email').value },
        { section: 'contact', key: 'headline', value: document.getElementById('site-contact-headline').value },
        { section: 'contact', key: 'subtext', value: document.getElementById('site-contact-subtext').value },
        { section: 'footer', key: 'copyright', value: document.getElementById('site-footer-copy').value }
    ];
    
    try {
        // Save each setting
        for (const setting of settings) {
            const { error } = await adminSupabase
                .from('site_settings')
                .upsert({ 
                    section: setting.section, 
                    key: setting.key, 
                    value: setting.value,
                    updated_at: new Date()
                }, { onConflict: ['section', 'key'] });
                
            if (error) throw error;
        }
        
        showSuccess('✅ Homepage updated! Refresh main site to see changes.');
    } catch (error) {
        showError('Failed to save: ' + error.message);
    }
}

// ==========================================
// CV EDITOR
// ==========================================

function addExperienceItem(data = null) {
    const container = document.getElementById('cv-experience-list');
    const div = document.createElement('div');
    div.className = 'cv-item-edit';
    div.innerHTML = `
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()">×</button>
        <div class="form-row">
            <div class="form-group">
                <label>Years</label>
                <input type="text" class="cv-year" placeholder="2022 - Present" value="${data?.year || ''}">
            </div>
            <div class="form-group">
                <label>Job Title</label>
                <input type="text" class="cv-title" placeholder="Senior Content Creator" value="${data?.title || ''}">
            </div>
        </div>
        <div class="form-group">
            <label>Company</label>
            <input type="text" class="cv-company" placeholder="Company Name" value="${data?.company || ''}">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea class="cv-desc" rows="2" placeholder="Describe your role and achievements...">${data?.description || ''}</textarea>
        </div>
    `;
    container.appendChild(div);
}

function addSkillCategory(data = null) {
    const container = document.getElementById('cv-skills-list');
    const div = document.createElement('div');
    div.className = 'skill-edit-item';
    div.style.cssText = 'background: white; padding: 1.25rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid var(--border); position: relative;';
    div.innerHTML = `
        <button type="button" class="btn-icon delete" onclick="this.parentElement.remove()" style="position: absolute; right: 0.75rem; top: 0.75rem;">🗑️</button>
        <input type="text" class="skill-cat-name" placeholder="Category Name (e.g., Content Creation)" value="${data?.category || ''}" style="width: 100%; margin-bottom: 0.75rem; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px;">
        <textarea class="skill-items" placeholder="Skills separated by commas (e.g., Video Editing, Photography, Photoshop)" rows="2" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; font-family: inherit;">${data?.items?.join(', ') || ''}</textarea>
    `;
    container.appendChild(div);
}

async function loadCVData() {
    if (!adminSupabase || !currentUser) return;
    
    try {
        // Try to load from profiles table
        const { data: profile, error } = await adminSupabase
            .from('profiles')
            .select('cv_data, cv_url')
            .eq('id', currentUser.id)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        
        // Clear existing
        document.getElementById('cv-experience-list').innerHTML = '';
        document.getElementById('cv-skills-list').innerHTML = '';
        
        if (profile?.cv_data) {
            // Load experiences
            if (profile.cv_data.experiences && profile.cv_data.experiences.length > 0) {
                profile.cv_data.experiences.forEach(exp => addExperienceItem(exp));
            } else {
                // Add one empty as template
                addExperienceItem();
            }
            
            // Load skills
            if (profile.cv_data.skills && profile.cv_data.skills.length > 0) {
                profile.cv_data.skills.forEach(skill => addSkillCategory(skill));
            } else {
                // Add default categories as templates
                addSkillCategory({ category: 'Content Creation', items: ['Video Editing', 'Copywriting', 'Photography', 'Motion Graphics'] });
                addSkillCategory({ category: 'Platforms', items: ['Instagram', 'TikTok', 'YouTube', 'LinkedIn'] });
            }
            
            // Load CV URL
            if (profile.cv_url) {
                document.getElementById('cv-download-url').value = profile.cv_url;
            }
        } else {
            // Add templates if no data
            addExperienceItem();
            addSkillCategory({ category: 'Content Creation', items: ['Video Editing', 'Copywriting', 'Photography', 'Motion Graphics'] });
            addSkillCategory({ category: 'Platforms', items: ['Instagram', 'TikTok', 'YouTube', 'LinkedIn'] });
        }
        
    } catch (error) {
        console.error('Error loading CV:', error);
        // Add templates as fallback
        addExperienceItem();
        addSkillCategory({ category: 'Content Creation', items: ['Video Editing', 'Copywriting', 'Photography', 'Motion Graphics'] });
    }
}

async function saveCVData() {
    if (!adminSupabase || !currentUser) {
        showError('Not authenticated');
        return;
    }
    
    // Collect experiences
    const experiences = [];
    document.querySelectorAll('.cv-item-edit').forEach(item => {
        experiences.push({
            year: item.querySelector('.cv-year').value,
            title: item.querySelector('.cv-title').value,
            company: item.querySelector('.cv-company').value,
            description: item.querySelector('.cv-desc').value
        });
    });
    
    // Collect skills
    const skills = [];
    document.querySelectorAll('.skill-edit-item').forEach(item => {
        const itemsText = item.querySelector('.skill-items').value;
        skills.push({
            category: item.querySelector('.skill-cat-name').value,
            items: itemsText ? itemsText.split(',').map(s => s.trim()).filter(s => s) : []
        });
    });
    
    const cvData = {
        experiences: experiences.filter(e => e.title),
        skills: skills.filter(s => s.category)
    };
    
    const cvUrl = document.getElementById('cv-download-url').value;
    
    try {
        const { error } = await adminSupabase
            .from('profiles')
            .upsert({
                id: currentUser.id,
                cv_data: cvData,
                cv_url: cvUrl,
                updated_at: new Date()
            }, { onConflict: 'id' });
            
        if (error) throw error;
        showSuccess('✅ CV saved successfully!');
    } catch (error) {
        showError('Failed to save CV: ' + error.message);
    }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function showError(message) {
    alert('❌ ' + message);
}

function showSuccess(message) {
    alert('✅ ' + message);
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('edit-modal');
    if (event.target === modal) {
        closeModal();
    }
}
