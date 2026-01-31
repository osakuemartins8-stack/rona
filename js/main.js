// Wait for DOM and Supabase to be ready
let supabase;
let videoIndex = 0;
let imageIndex = 0;
let videoItems = [];
let imageItems = [];
let autoSlideInterval;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Supabase with delay to ensure library loaded
    setTimeout(() => {
        if (typeof PortfolioConfig !== 'undefined') {
            supabase = PortfolioConfig.getSupabase();
        } else if (window.supabase) {
            // Fallback if config not loaded
            supabase = window.supabase.createClient(
                'https://glnfhjudzdwetdloofvk.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbmZoanVkemR3ZXRkbG9vZnZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTE2MzcsImV4cCI6MjA4NTM2NzYzN30.74j2K1FprAH4C3d_H3b588RcRPj39EKtSV1UUskNOW0'
            );
        }
        
        if (supabase) {
            loadContent();
        } else {
            console.error('Supabase not loaded');
            loadFallbackContent();
        }
    }, 100);
    
    setupMobileNav();
    setupScrollAnimations();
});

// Load content from Supabase
async function loadContent() {
    try {
        const { data, error } = await supabase
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
        startAutoSlide();

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

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function extractVimeoId(url) {
    const regExp = /vimeo\.com\/(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
}

function loadFallbackContent() {
    videoItems = [{
        title: 'Fashion Campaign',
        description: 'Summer 2024 collection showcase',
        url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        source_type: 'url'
    }];
    imageItems = [
        {title: 'Editorial Shoot', description: 'Magazine feature', url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800', source_type: 'url'},
        {title: 'Brand Collab', description: 'Beauty partnership', url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800', source_type: 'url'}
    ];
    renderVideos();
    renderImages();
    setupDots();
    startAutoSlide();
}

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
    if (autoSlideInterval) clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(() => {
        if (imageItems.length <= 1) return;
        const visibleItems = window.innerWidth <= 968 ? 1 : 2;
        imageIndex++;
        if (imageIndex > imageItems.length - visibleItems) imageIndex = 0;
        updateSlider('image', imageIndex);
        updateDots('image', imageIndex);
    }, 4000);
}

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
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

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
    const originalText = btn.innerText;
    
    btn.innerHTML = '<span class="loading"></span> Sending...';
    btn.disabled = true;

    setTimeout(() => {
        btn.innerText = 'Sent!';
        btn.style.background = 'var(--gradient-2)';
        e.target.reset();
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = '';
            btn.disabled = false;
        }, 2000);
    }, 1000);
}

function downloadCV() {
    alert('Add your CV PDF link here!');
}

window.addEventListener('resize', () => {
    setupDots();
    videoIndex = 0;
    imageIndex = 0;
    updateSlider('video', 0);
    updateSlider('image', 0);
});