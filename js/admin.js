// Admin Panel JavaScript
let currentUser = null;
let allContent = [];

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        await checkAdminAccess();
    } else {
        showLogin();
    }
});

// Show/Hide Screens
function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    initDashboard();
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        await checkAdminAccess();
        
    } catch (error) {
        errorDiv.textContent = error.message || 'Login failed. Please check your credentials.';
    }
}

// Check Admin Access
async function checkAdminAccess() {
    try {
        const { data: profile, error } = await window.supabaseClient
            .from('profiles')
            .select('is_admin')
            .eq('id', currentUser.id)
            .single();
        
        if (error || !profile || !profile.is_admin) {
            document.getElementById('login-error').textContent = 'Access denied. Admin privileges required.';
            await window.supabaseClient.auth.signOut();
            return;
        }
        
        showDashboard();
        
    } catch (error) {
        console.error('Admin check error:', error);
        document.getElementById('login-error').textContent = 'Error checking admin access.';
    }
}

// Logout
async function handleLogout() {
    await window.supabaseClient.auth.signOut();
    showLogin();
}

// Initialize Dashboard
async function initDashboard() {
    // Set user info
    document.getElementById('user-email').textContent = currentUser.email;
    const avatar = document.getElementById('user-avatar');
    avatar.textContent = currentUser.email.charAt(0).toUpperCase();
    
    // Load initial data
    await loadAllContent();
    await loadSiteSettingsIntoForm();
    await loadCVData();
}

// ============================================
// CONTENT MANAGEMENT
// ============================================

async function loadAllContent() {
    try {
        const { data, error } = await window.supabaseClient
            .from('portfolio_content')
            .select('*')
            .order('order_index', { ascending: true });
        
        if (error) throw error;
        
        allContent = data || [];
        renderContentGrid(allContent);
        
    } catch (error) {
        console.error('Error loading content:', error);
        document.getElementById('content-grid').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h3>No content yet</h3>
                <p>Start by adding your first video or image!</p>
            </div>
        `;
    }
}

function renderContentGrid(items) {
    const grid = document.getElementById('content-grid');
    
    if (!items || items.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h3>No content yet</h3>
                <p>Click "Add New" to upload your first piece of content!</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = items.map(item => `
        <div class="content-card" data-id="${item.id}">
            <div class="content-preview">
                ${renderPreview(item)}
                <div class="content-type-badge">${item.content_type}</div>
            </div>
            <div class="content-info">
                <h3>${item.title}</h3>
                <p>${item.description || 'No description'}</p>
                <div class="content-meta">
                    <span>Order: ${item.order_index}</span>
                    <span class="status-badge ${item.is_active ? 'status-active' : 'status-inactive'}">
                        ${item.is_active ? 'Active' : 'Hidden'}
                    </span>
                </div>
                <div class="content-actions">
                    <button class="btn-icon" onclick="editContent('${item.id}')" title="Edit">✏️</button>
                    <button class="btn-icon delete" onclick="deleteContent('${item.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderPreview(item) {
    if (item.content_type === 'image') {
        const imageUrl = item.source_type === 'url' 
            ? item.url 
            : `https://glnfhjudzdwetdloofvk.supabase.co/storage/v1/object/public/portfolio-media/${item.storage_path}`;
        return `<img src="${imageUrl}" alt="${item.title}">`;
    } else {
        if (item.thumbnail_url) {
            return `<img src="${item.thumbnail_url}" alt="${item.title}">`;
        }
        return `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f5f5f5;color:#999;font-size:3rem;">🎬</div>`;
    }
}

function filterContent() {
    const filterType = document.getElementById('filter-type').value;
    
    if (filterType === 'all') {
        renderContentGrid(allContent);
    } else {
        const filtered = allContent.filter(item => item.content_type === filterType);
        renderContentGrid(filtered);
    }
}

// Edit Content
function editContent(id) {
    const item = allContent.find(i => i.id === id);
    if (!item) return;
    
    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-title').value = item.title;
    document.getElementById('edit-description').value = item.description || '';
    document.getElementById('edit-order').value = item.order_index;
    document.getElementById('edit-active').checked = item.is_active;
    
    document.getElementById('edit-modal').classList.remove('hidden');
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('edit-id').value;
    const updates = {
        title: document.getElementById('edit-title').value,
        description: document.getElementById('edit-description').value,
        order_index: parseInt(document.getElementById('edit-order').value),
        is_active: document.getElementById('edit-active').checked
    };
    
    try {
        const { error } = await window.supabaseClient
            .from('portfolio_content')
            .update(updates)
            .eq('id', id);
        
        if (error) throw error;
        
        alert('✅ Content updated successfully!');
        closeModal();
        await loadAllContent();
        
    } catch (error) {
        alert('❌ Error updating content: ' + error.message);
    }
}

async function deleteContent(id) {
    if (!confirm('Are you sure you want to delete this content? This cannot be undone.')) {
        return;
    }
    
    try {
        const { error } = await window.supabaseClient
            .from('portfolio_content')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        alert('✅ Content deleted successfully!');
        await loadAllContent();
        
    } catch (error) {
        alert('❌ Error deleting content: ' + error.message);
    }
}

function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

// ============================================
// ADD NEW CONTENT
// ============================================

function switchTab(tab) {
    const linkForm = document.getElementById('link-form');
    const fileForm = document.getElementById('file-form');
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'link') {
        linkForm.classList.remove('hidden');
        fileForm.classList.add('hidden');
        tabs[0].classList.add('active');
    } else {
        linkForm.classList.add('hidden');
        fileForm.classList.remove('hidden');
        tabs[1].classList.add('active');
    }
}

function toggleLinkPlaceholder() {
    const type = document.getElementById('link-type').value;
    const urlInput = document.getElementById('link-url');
    const helpText = document.getElementById('link-help');
    
    if (type === 'video') {
        urlInput.placeholder = 'https://youtube.com/watch?v=...';
        helpText.textContent = 'Paste YouTube, Vimeo, or any video link';
    } else {
        urlInput.placeholder = 'https://example.com/image.jpg';
        helpText.textContent = 'Paste direct image URL (must end in .jpg, .png, etc)';
    }
}

function previewLink() {
    // Optional: Add live preview functionality
}

async function handleLinkSubmit(e) {
    e.preventDefault();
    
    const contentData = {
        content_type: document.getElementById('link-type').value,
        title: document.getElementById('link-title').value,
        description: document.getElementById('link-description').value,
        source_type: 'url',
        url: document.getElementById('link-url').value,
        thumbnail_url: document.getElementById('link-thumbnail').value || null,
        order_index: allContent.length,
        is_active: true
    };
    
    try {
        const { error } = await window.supabaseClient
            .from('portfolio_content')
            .insert([contentData]);
        
        if (error) throw error;
        
        alert('✅ Content added successfully!');
        e.target.reset();
        showSection('content', document.querySelectorAll('.nav-item')[0]);
        await loadAllContent();
        
    } catch (error) {
        alert('❌ Error adding content: ' + error.message);
    }
}

// File Upload
function updateFileAccept() {
    const type = document.getElementById('file-type').value;
    const input = document.getElementById('file-input');
    
    if (type === 'image') {
        input.accept = 'image/*';
    } else {
        input.accept = 'video/*';
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const preview = document.getElementById('file-preview');
    const content = document.getElementById('preview-content');
    
    preview.classList.remove('hidden');
    
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            content.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; border-radius: 8px;">`;
        };
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        content.innerHTML = `<p><strong>📹 ${file.name}</strong><br><small>${(file.size / 1024 / 1024).toFixed(2)} MB</small></p>`;
    }
}

function clearFile() {
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview').classList.add('hidden');
}

async function handleFileSubmit(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file first!');
        return;
    }
    
    // Show loading
    const btn = document.getElementById('upload-btn');
    const btnText = btn.querySelector('.btn-text');
    const loading = btn.querySelector('.loading');
    btnText.classList.add('hidden');
    loading.classList.remove('hidden');
    btn.disabled = true;
    
    try {
        // Upload to Supabase Storage
        const fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
            .from('portfolio-media')
            .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        // Insert record
        const contentData = {
            content_type: document.getElementById('file-type').value,
            title: document.getElementById('file-title').value,
            description: document.getElementById('file-description').value,
            source_type: 'storage',
            storage_path: uploadData.path,
            order_index: allContent.length,
            is_active: true
        };
        
        const { error: insertError } = await window.supabaseClient
            .from('portfolio_content')
            .insert([contentData]);
        
        if (insertError) throw insertError;
        
        alert('✅ File uploaded successfully!');
        e.target.reset();
        clearFile();
        showSection('content', document.querySelectorAll('.nav-item')[0]);
        await loadAllContent();
        
    } catch (error) {
        alert('❌ Upload error: ' + error.message);
    } finally {
        btnText.classList.remove('hidden');
        loading.classList.add('hidden');
        btn.disabled = false;
    }
}

// ============================================
// SITE SETTINGS EDITOR
// ============================================

async function loadSiteSettingsIntoForm() {
    try {
        const { data, error } = await window.supabaseClient
            .from('site_settings')
            .select('*');
        
        if (error) throw error;
        
        // Convert to object
        const settings = {};
        data.forEach(item => {
            if (!settings[item.section]) settings[item.section] = {};
            settings[item.section][item.key] = item.value;
        });
        
        // Populate form fields
        if (settings.hero) {
            document.getElementById('site-hero-headline').value = settings.hero.headline || '';
            document.getElementById('site-hero-subtitle').value = settings.hero.subtitle || '';
            document.getElementById('site-hero-cta1').value = settings.hero.cta_primary || '';
            document.getElementById('site-hero-cta2').value = settings.hero.cta_secondary || '';
        }
        
        if (settings.about) {
            document.getElementById('site-about-image').value = settings.about.profile_image || '';
            document.getElementById('site-about-lead').value = settings.about.lead_text || '';
            document.getElementById('site-about-bio').value = settings.about.bio_text || '';
        }
        
        if (settings.stats) {
            document.getElementById('site-stat-1').value = settings.stats.campaigns || '';
            document.getElementById('site-stat-1-label').value = settings.stats.campaigns_label || '';
            document.getElementById('site-stat-2').value = settings.stats.views || '';
            document.getElementById('site-stat-2-label').value = settings.stats.views_label || '';
            document.getElementById('site-stat-3').value = settings.stats.experience || '';
            document.getElementById('site-stat-3-label').value = settings.stats.experience_label || '';
        }
        
        if (settings.social) {
            document.getElementById('site-social-insta').value = settings.social.instagram || '';
            document.getElementById('site-social-tiktok').value = settings.social.tiktok || '';
            document.getElementById('site-social-linkedin').value = settings.social.linkedin || '';
            document.getElementById('site-social-email').value = settings.social.email?.replace('mailto:', '') || '';
        }
        
        if (settings.contact) {
            document.getElementById('site-contact-headline').value = settings.contact.headline || '';
            document.getElementById('site-contact-subtext').value = settings.contact.subtext || '';
        }
        
        if (settings.footer) {
            document.getElementById('site-footer-copy').value = settings.footer.copyright || '';
        }
        
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveAllSiteSettings() {
    const settingsToSave = [
        // Hero
        { section: 'hero', key: 'headline', value: document.getElementById('site-hero-headline').value },
        { section: 'hero', key: 'subtitle', value: document.getElementById('site-hero-subtitle').value },
        { section: 'hero', key: 'cta_primary', value: document.getElementById('site-hero-cta1').value },
        { section: 'hero', key: 'cta_secondary', value: document.getElementById('site-hero-cta2').value },
        
        // About
        { section: 'about', key: 'profile_image', value: document.getElementById('site-about-image').value },
        { section: 'about', key: 'lead_text', value: document.getElementById('site-about-lead').value },
        { section: 'about', key: 'bio_text', value: document.getElementById('site-about-bio').value },
        
        // Stats
        { section: 'stats', key: 'campaigns', value: document.getElementById('site-stat-1').value },
        { section: 'stats', key: 'campaigns_label', value: document.getElementById('site-stat-1-label').value },
        { section: 'stats', key: 'views', value: document.getElementById('site-stat-2').value },
        { section: 'stats', key: 'views_label', value: document.getElementById('site-stat-2-label').value },
        { section: 'stats', key: 'experience', value: document.getElementById('site-stat-3').value },
        { section: 'stats', key: 'experience_label', value: document.getElementById('site-stat-3-label').value },
        
        // Social
        { section: 'social', key: 'instagram', value: document.getElementById('site-social-insta').value },
        { section: 'social', key: 'tiktok', value: document.getElementById('site-social-tiktok').value },
        { section: 'social', key: 'linkedin', value: document.getElementById('site-social-linkedin').value },
        { section: 'social', key: 'email', value: 'mailto:' + document.getElementById('site-social-email').value },
        
        // Contact
        { section: 'contact', key: 'headline', value: document.getElementById('site-contact-headline').value },
        { section: 'contact', key: 'subtext', value: document.getElementById('site-contact-subtext').value },
        
        // Footer
        { section: 'footer', key: 'copyright', value: document.getElementById('site-footer-copy').value }
    ];
    
    try {
        // Delete existing settings
        await window.supabaseClient.from('site_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Insert new settings
        const { error } = await window.supabaseClient
            .from('site_settings')
            .insert(settingsToSave);
        
        if (error) throw error;
        
        alert('✅ All homepage settings saved! Check your website to see the changes.');
        
    } catch (error) {
        alert('❌ Error saving settings: ' + error.message);
    }
}

// ============================================
// CV EDITOR
// ============================================

let cvExperiences = [];
let cvSkills = [];

async function loadCVData() {
    try {
        const { data: profile, error } = await window.supabaseClient
            .from('profiles')
            .select('cv_data, cv_url')
            .eq('id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        if (profile?.cv_data) {
            cvExperiences = profile.cv_data.experiences || [];
            cvSkills = profile.cv_data.skills || [];
        }
        
        if (profile?.cv_url) {
            document.getElementById('cv-download-url').value = profile.cv_url;
        }
        
        renderCVExperiences();
        renderCVSkills();
        
    } catch (error) {
        console.error('Error loading CV:', error);
    }
}

function renderCVExperiences() {
    const container = document.getElementById('cv-experience-list');
    
    if (cvExperiences.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No experience added yet. Click below to add your first job!</p>';
        return;
    }
    
    container.innerHTML = cvExperiences.map((exp, index) => `
        <div class="cv-item-edit">
            <button class="remove-btn" onclick="removeExperience(${index})">×</button>
            <div class="form-group">
                <label>Year/Period</label>
                <input type="text" value="${exp.year}" onchange="cvExperiences[${index}].year = this.value" placeholder="2020 - Present">
            </div>
            <div class="form-group">
                <label>Job Title</label>
                <input type="text" value="${exp.title}" onchange="cvExperiences[${index}].title = this.value" placeholder="Senior Content Creator">
            </div>
            <div class="form-group">
                <label>Company</label>
                <input type="text" value="${exp.company}" onchange="cvExperiences[${index}].company = this.value" placeholder="Company Name">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea rows="2" onchange="cvExperiences[${index}].description = this.value" placeholder="Brief description of your role...">${exp.description}</textarea>
            </div>
        </div>
    `).join('');
}

function addExperienceItem() {
    cvExperiences.push({
        year: '2024 - Present',
        title: 'Job Title',
        company: 'Company Name',
        description: 'What you did in this role...'
    });
    renderCVExperiences();
}

function removeExperience(index) {
    cvExperiences.splice(index, 1);
    renderCVExperiences();
}

function renderCVSkills() {
    const container = document.getElementById('cv-skills-list');
    
    if (cvSkills.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No skills added yet. Add your first skill category below!</p>';
        return;
    }
    
    container.innerHTML = cvSkills.map((skill, index) => `
        <div class="skill-edit-item">
            <button class="remove-btn" onclick="removeSkill(${index})">×</button>
            <input type="text" value="${skill.category}" onchange="cvSkills[${index}].category = this.value" placeholder="Category (e.g., Video Production)">
            <textarea rows="2" onchange="cvSkills[${index}].items = this.value" placeholder="Comma-separated skills: Premiere Pro, After Effects, DaVinci Resolve">${skill.items}</textarea>
        </div>
    `).join('');
}

function addSkillCategory() {
    cvSkills.push({
        category: 'New Category',
        items: 'Skill 1, Skill 2, Skill 3'
    });
    renderCVSkills();
}

function removeSkill(index) {
    cvSkills.splice(index, 1);
    renderCVSkills();
}

async function saveCVData() {
    const cvData = {
        experiences: cvExperiences,
        skills: cvSkills
    };
    
    const cvUrl = document.getElementById('cv-download-url').value;
    
    try {
        const { error } = await window.supabaseClient
            .from('profiles')
            .update({
                cv_data: cvData,
                cv_url: cvUrl
            })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        alert('✅ CV data saved successfully!');
        
    } catch (error) {
        alert('❌ Error saving CV: ' + error.message);
    }
}

// ============================================
// NAVIGATION
// ============================================

function showSection(sectionName, clickedLink) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.add('active');
    if (clickedLink) clickedLink.classList.add('active');
    
    // Update page title
    const titles = {
        'content': 'Content Management',
        'upload': 'Add New Content',
        'profile': 'Edit Homepage',
        'cv': 'Edit CV & Resume'
    };
    document.getElementById('page-title').textContent = titles[sectionName] || 'Dashboard';
}
