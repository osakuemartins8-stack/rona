// Site Configuration
let siteData = {};

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    // Show loading
    const loadingScreen = document.getElementById('loading-screen');
    
    try {
        // Supabase already initialized in config.js
        if (!window.supabaseClient) {
            console.error('Supabase not loaded');
            loadFallbackData();
            if (loadingScreen) loadingScreen.remove();
            return;
        }

        // Load all site data
        await loadSiteSettings();
        await loadPortfolioContent();
        await loadCVData();
        
        // Hide loading screen
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.remove(), 500);
        }
        
        // Setup interactions
        setupMobileNav();
        setupScrollAnimations();
        startAutoSlide();
        
    } catch (error) {
        console.error('Initialization error:', error);
        // Load fallback data if Supabase fails
        loadFallbackData();
        if (loadingScreen) loadingScreen.remove();
    }
});

// Load Site Settings
async function loadSiteSettings() {
    try {
        const { data, error } = await window.supabaseClient
            .from('site_settings')
            .select('*');
            
        if (error) throw error;
        
        // Convert to easy-to-use object
        siteData = {};
        data.forEach(item => {
            if (!siteData[item.section]) siteData[item.section] = {};
            siteData[item.section][item.key] = item.value;
        });
        
        applySiteData();
        
    } catch (error) {
        console.error('Error loading settings:', error);
        loadFallbackSiteData();
    }
}

// Apply loaded data to DOM
function applySiteData() {
    // Hero Section
    if (siteData.hero) {
        const headline = document.getElementById('hero-headline');
        if (headline && siteData.hero.headline) {
            headline.textContent = siteData.hero.headline;
            headline.setAttribute('data-text', siteData.hero.headline);
        }
        
        const subtitle = document.getElementById('hero-subtitle');
        if (subtitle && siteData.hero.subtitle) subtitle.textContent = siteData.hero.subtitle;
        
        const ctaPrimary = document.getElementById('hero-cta-primary');
        if (ctaPrimary && siteData.hero.cta_primary) ctaPrimary.textContent = siteData.hero.cta_primary;
        
        const ctaSecondary = document.getElementById('hero-cta-secondary');
        if (ctaSecondary && siteData.hero.cta_secondary) ctaSecondary.textContent = siteData.hero.cta_secondary;
        
        document.title = siteData.hero.headline || 'Creative Portfolio';
    }
    
    // About Section
    if (siteData.about) {
        const lead = document.getElementById('about-lead');
        if (lead && siteData.about.lead_text) lead.textContent = siteData.about.lead_text;
        
        const bio = document.getElementById('about-bio');
        if (bio && siteData.about.bio_text) bio.textContent = siteData.about.bio_text;
        
        const profileImg = document.getElementById('profile-image');
        if (profileImg && siteData.about.profile_image) {
            profileImg.src = siteData.about.profile_image;
            profileImg.onerror = function() {
                this.src = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600';
            };
        }
    }
    
    // Stats
    if (siteData.stats) {
        const statsContainer = document.getElementById('stats-container');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-item">
                    <span class="stat-number">${siteData.stats.campaigns || '50+'}</span>
                    <span class="stat-label">${siteData.stats.campaigns_label || 'Brand Campaigns'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${siteData.stats.views || '10M+'}</span>
                    <span class="stat-label">${siteData.stats.views_label || 'Total Views'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${siteData.stats.experience || '5'}</span>
                    <span class="stat-label">${siteData.stats.experience_label || 'Years Experience'}</span>
                </div>
            `;
        }
    }
    
    // Contact Section
    if (siteData.contact) {
        const headline = document.getElementById('contact-headline');
        if (headline && siteData.contact.headline) {
            headline.innerHTML = siteData.contact.headline.replace(
                'Amazing', 
                '<span class="highlight">Amazing</span>'
            );
        }
        
        const subtext = document.getElementById('contact-subtext');
        if (subtext && siteData.contact.subtext) subtext.textContent = siteData.contact.subtext;
    }
    
    // Social Links
    if (siteData.social) {
        const container = document.getElementById('social-links-container');
        if (container) {
            let html = '';
            if (siteData.social.instagram) {
                html += `<a href="${siteData.social.instagram}" class="social-link" target="_blank">Instagram</a>`;
            }
            if (siteData.social.tiktok) {
                html += `<a href="${siteData.social.tiktok}" class="social-link" target="_blank">TikTok</a>`;
            }
            if (siteData.social.linkedin) {
                html += `<a href="${siteData.social.linkedin}" class="social-link" target="_blank">LinkedIn</a>`;
            }
            if (siteData.social.email) {
                html += `<a href="${siteData.social.email}" class="social-link">Email</a>`;
            }
            container.innerHTML = html;
        }
    }
    
    // Footer
    if (siteData.footer) {
        const copyright = document.getElementById('footer-copyright');
        if (copyright && siteData.footer.copyright) copyright.textContent = siteData.footer.copyright;
    }
}

// Load CV/Experience Data
async function loadCVData() {
    try {
        // Try to load from profiles or cv_data table
        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .limit(1)
            .single();
            
        if (profile) {
            // Update CV timeline if you have cv_data in profile
            const timeline = document.getElementById('cv-timeline');
            if (timeline && profile.cv_data) {
                const cv = profile.cv_data;
                let html = '';
                if (cv.experiences) {
                    cv.experiences.forEach(exp => {
                        html += `
                            <div class="timeline-item">
                                <div class="timeline-marker"></div>
                                <div class="timeline-content">
                                    <span class="timeline-date">${exp.year}</span>
                                    <h4>${exp.title}</h4>
                                    <p class="company">${exp.company}</p>
                                    <p>${exp.description}</p>
                                </div>
                            </div>
                        `;
                    });
                }
                timeline.innerHTML = html;
            }
            
            // Update CV download link
            const cvBtn = document.getElementById('cv-download-btn');
            if (cvBtn && profile.cv_url) {
                cvBtn.href = profile.cv_url;
                cvBtn.target = '_blank';
            }
        }
        
    } catch (error) {
        console.log('CV data not loaded, using defaults');
        loadFallbackCV();
    }
}

// Load Portfolio Content (Videos/Images)
let videoIndex = 0;
let imageIndex = 0;
let videoItems = [];
let imageItems = [];

async function loadPortfolioContent() {
    try {
        const { data, error } = await window.supabaseClient
            .from('portfolio_content')
            .select('*')
            .eq('is_active', true)
            .order('order_index', { ascending: true });

        if (error) throw error;

        videoItems = data.filter(item => item.content_type === 'video');
        imageItems = data.filter(item => item.content_type === 'image');

        renderVideos();
        renderImages();
        setupDots();

    } catch (error) {
        console.error('Error loading content:', error);
        loadFallbackContent();
    }
}

function renderVideos() {
    const track = document.getElementById('video-track');
    if (!track) return;

    if (videoItems.length === 0) {
        track.innerHTML = '<div class="content-item"><div class="content-info"><h4>No videos yet</h4><p>Check back soon!</p></div></div>';
        return;
    }

    track.innerHTML = videoItems.map(item => {
        let mediaContent;
        
        if (item.source_type === 'url') {
            if (item.url.includes('youtube') || item.url.includes('youtu.be')) {
                const videoId = extractYouTubeId(item.url);
                mediaContent = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen loading="lazy"></iframe>`;
            } else if (item.url.includes('vimeo')) {
                const videoId = extractVimeoId(item.url);
                mediaContent = `<iframe src="https://player.vimeo.com/video/${videoId}" frameborder="0" allowfullscreen loading="lazy"></iframe>`;
            } else {
                mediaContent = `<video controls poster="${item.thumbnail_url || ''}" preload="none"><source src="${item.url}" type="video/mp4"></video>`;
            }
        } else {
            const videoUrl = `https://glnfhjudzdwetdloofvk.supabase.co/storage/v1/object/public/portfolio-media/${item.storage_path}`;
            mediaContent = `<video controls poster="${item.thumbnail_url || ''}" preload="none"><source src="${videoUrl}" type="video/mp4"></video>`;
        }

        return `
            <div class="content-item">
                <div class="video-container">
                    ${mediaContent}
                </div>
                <div class="content-info">
                    <h4>${item.title}</h4>
                    <p>${item.description || ''}</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderImages() {
    const track = document.getElementById('image-track');
    if (!track) return;

    if (imageItems.length === 0) {
        track.innerHTML = '<div class="content-item"><div class="image-container"><img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600" alt="Placeholder"></div><div class="content-info"><h4>Summer Collection</h4><p>Coming soon</p></div></div>';
        return;
    }

    track.innerHTML = imageItems.map(item => {
        let imageUrl = item.source_type === 'url' ? item.url : `https://glnfhjudzdwetdloofvk.supabase.co/storage/v1/object/public/portfolio-media/${item.storage_path}`;
        
        return `
            <div class="content-item">
                <div class="image-container">
                    <img src="${imageUrl}" alt="${item.title}" loading="lazy">
                </div>
                <div class="content-info">
                    <h4>${item.title}</h4>
                    <p>${item.description || ''}</p>
                </div>
            </div>
        `;
    }).join('');
}

// Slider Functions
function slideContent(type, direction) {
    const items = type === 'video' ? videoItems : imageItems;
    const visibleItems = window.innerWidth <= 968 ? 1 : 2;
    const maxIndex = Math.max(0, items.length - visibleItems);
    
    if (type === 'video') {
        videoIndex = Math.max(0, Math.min(videoIndex + direction, maxIndex));
        updateSlider('video', videoIndex);
    } else {
        imageIndex = Math.max(0, Math.min(imageIndex + direction, maxIndex));
        updateSlider('image', imageIndex);
    }
    updateDots(type, type === 'video' ? videoIndex : imageIndex);
}

function updateSlider(type, index) {
    const track = document.getElementById(`${type}-track`);
    if (!track || !track.children[0]) return;
    const itemWidth = track.children[0].offsetWidth + 24;
    track.style.transform = `translateX(-${index * itemWidth}px)`;
}

function setupDots() {
    setupDotContainer('video', videoItems);
    setupDotContainer('image', imageItems);
}

function setupDotContainer(type, items) {
    const dotsContainer = document.getElementById(`${type}-dots`);
    if (!dotsContainer) return;
    const visibleItems = window.innerWidth <= 968 ? 1 : 2;
    const dotCount = Math.max(1, items.length - visibleItems + 1);
    
    dotsContainer.innerHTML = Array(dotCount).fill(0).map((_, i) => 
        `<div class="dot ${i === 0 ? 'active' : ''}" onclick="goToSlide('${type}', ${i})"></div>`
    ).join('');
}

function updateDots(type, index) {
    const dots = document.querySelectorAll(`#${type}-dots .dot`);
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
}

function goToSlide(type, index) {
    if (type === 'video') {
        videoIndex = index;
        updateSlider('video', videoIndex);
    } else {
        imageIndex = index;
        updateSlider('image', imageIndex);
    }
    updateDots(type, index);
}

function startAutoSlide() {
    setInterval(() => {
        if (imageItems.length <= 1) return;
        const visibleItems = window.innerWidth <= 968 ? 1 : 2;
        imageIndex++;
        if (imageIndex > imageItems.length - visibleItems) imageIndex = 0;
        updateSlider('image', imageIndex);
        updateDots('image', imageIndex);
    }, 5000);
}

// Utility Functions
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : 'dQw4w9WgXcQ';
}

function extractVimeoId(url) {
    const regExp = /vimeo\.com\/(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : '76979871';
}

// Fallback Data
function loadFallbackData() {
    loadFallbackSiteData();
    loadFallbackContent();
    loadFallbackCV();
}

function loadFallbackSiteData() {
    siteData = {
        hero: {
            headline: 'CREATIVE CONTENT',
            subtitle: 'Social Media Strategist & Visual Storyteller',
            cta_primary: 'View My Work',
            cta_secondary: 'Get In Touch'
        },
        about: {
            lead_text: 'I\'m a passionate content creator specializing in social media strategy, video production, and brand storytelling.',
            bio_text: 'With over 5 years of experience in digital marketing, I\'ve helped brands grow their online presence through engaging visual content.',
            profile_image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600'
        },
        stats: {
            campaigns: '50+',
            campaigns_label: 'Brand Campaigns',
            views: '10M+',
            views_label: 'Total Views',
            experience: '5',
            experience_label: 'Years Experience'
        },
        contact: {
            headline: 'Let\'s Create Something Amazing Together',
            subtext: 'Open for collaborations, freelance projects, and full-time opportunities.'
        },
        social: {
            instagram: '#',
            tiktok: '#',
            linkedin: '#',
            email: 'mailto:hello@example.com'
        }
    };
    applySiteData();
}

function loadFallbackContent() {
    videoItems = [{
        title: 'Sample Video',
        description: 'Add your videos in admin',
        url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        source_type: 'url'
    }];
    imageItems = [{
        title: 'Sample Image',
        description: 'Add your images in admin',
        url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',
        source_type: 'url'
    }];
    renderVideos();
    renderImages();
    setupDots();
}

function loadFallbackCV() {
    const timeline = document.getElementById('cv-timeline');
    if (timeline) {
        timeline.innerHTML = `
            <div class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <span class="timeline-date">2022 - Present</span>
                    <h4>Senior Content Creator</h4>
                    <p class="company">Creative Agency</p>
                    <p>Add your experience in the admin panel.</p>
                </div>
            </div>
        `;
    }
}

// UI Interactions
function setupMobileNav() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
}

function setupScrollAnimations() {
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.timeline-item, .skill-category, .stat-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

function handleContactSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = '<span class="loading"></span> Sending...';
    btn.disabled = true;
    setTimeout(() => {
        btn.textContent = 'Message Sent!';
        btn.style.background = 'var(--gradient-2)';
        e.target.reset();
        setTimeout(() => {
            btn.textContent = 'Send Message';
            btn.style.background = '';
            btn.disabled = false;
        }, 2000);
    }, 1000);
}

window.addEventListener('resize', () => {
    setupDots();
    videoIndex = 0;
    imageIndex = 0;
    updateSlider('video', 0);
    updateSlider('image', 0);
});
