// ============================================
// Countdown Timer
// ============================================
function updateCountdown() {
    const weddingDate = new Date('2027-04-25T15:00:00+02:00');
    const now = new Date();
    const diff = weddingDate - now;

    if (diff <= 0) {
        document.getElementById('days').textContent = '0';
        document.getElementById('hours').textContent = '0';
        document.getElementById('minutes').textContent = '0';
        document.getElementById('seconds').textContent = '0';
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    // Only update if value changed to avoid unnecessary reflows
    if (daysEl.textContent !== String(days)) daysEl.textContent = days;
    if (hoursEl.textContent !== String(hours)) hoursEl.textContent = hours;
    if (minutesEl.textContent !== String(minutes)) minutesEl.textContent = minutes;
    if (secondsEl.textContent !== String(seconds)) secondsEl.textContent = seconds;
}

updateCountdown();
setInterval(updateCountdown, 1000);

// ============================================
// Navigation
// ============================================
const navbar = document.getElementById('navbar');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

// Sticky nav on scroll with throttle
let lastScrollY = 0;
let ticking = false;

function handleScroll() {
    lastScrollY = window.scrollY;
    if (!ticking) {
        requestAnimationFrame(() => {
            if (lastScrollY > 80) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
            ticking = false;
        });
        ticking = true;
    }
}

window.addEventListener('scroll', handleScroll, { passive: true });

// Mobile menu toggle
navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
    document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
});

// Close mobile menu on link click
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.style.overflow = '';
    });
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = navbar.offsetHeight + 10;
            const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    });
});

// ============================================
// Scroll Animations
// ============================================
const animateElements = document.querySelectorAll('[data-animate]');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

animateElements.forEach(el => observer.observe(el));

// ============================================
// Hide scroll indicator on scroll
// ============================================
const scrollIndicator = document.querySelector('.hero-scroll-indicator');
if (scrollIndicator) {
    let indicatorHidden = false;
    window.addEventListener('scroll', () => {
        if (!indicatorHidden && window.scrollY > 100) {
            scrollIndicator.style.opacity = '0';
            scrollIndicator.style.transition = 'opacity 0.5s ease';
            indicatorHidden = true;
        }
    }, { passive: true });
}

// ============================================
// RSVP Form
// ============================================
const form = document.getElementById('rsvp-form');
const aanwezigRadios = document.querySelectorAll('input[name="aanwezig"]');
const extraFields = document.getElementById('extra-fields');
const successDiv = document.getElementById('rsvp-success');
const successMessage = document.getElementById('success-message');

// Show/hide extra fields based on attendance
aanwezigRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'ja') {
            extraFields.classList.remove('hidden');
            // Force reflow then set height
            void extraFields.offsetHeight;
            extraFields.style.maxHeight = extraFields.scrollHeight + 'px';
        } else {
            extraFields.style.maxHeight = '0';
            setTimeout(() => extraFields.classList.add('hidden'), 500);
        }
    });
});

// Form submission
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    const btnSubmit = document.getElementById('btn-submit');

    // Show loading state
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    btnSubmit.disabled = true;

    // Collect form data
    const formData = new FormData(form);
    const data = {
        naam: formData.get('naam'),
        email: formData.get('email'),
        aanwezig: formData.get('aanwezig'),
        aantal: formData.get('aanwezig') === 'ja' ? formData.get('aantal') : null,
        dieet: formData.get('aanwezig') === 'ja' ? formData.get('dieet') : null,
        muziek: formData.get('aanwezig') === 'ja' ? formData.get('muziek') : null,
        bericht: formData.get('bericht'),
        timestamp: new Date().toISOString()
    };

    // Store RSVP in localStorage
    saveRSVP(data);

    // Simulate sending delay for UX
    setTimeout(() => {
        form.style.opacity = '0';
        form.style.transform = 'translateY(-10px)';
        form.style.transition = 'opacity 0.4s ease, transform 0.4s ease';

        setTimeout(() => {
            form.classList.add('hidden');

            if (data.aanwezig === 'ja') {
                successMessage.textContent = `Geweldig ${data.naam}! We kijken ernaar uit om jullie te zien in Málaga!`;
            } else {
                successMessage.textContent = `Jammer dat je er niet bij kunt zijn, ${data.naam}. We zullen je missen!`;
            }

            successDiv.classList.remove('hidden');
            successDiv.classList.add('animate-in');

            // Scroll to success message
            successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 400);
    }, 1200);
});

// ============================================
// RSVP Storage (localStorage)
// ============================================
function saveRSVP(data) {
    const rsvps = getRSVPs();
    const existingIndex = rsvps.findIndex(r => r.email === data.email);
    if (existingIndex >= 0) {
        rsvps[existingIndex] = data;
    } else {
        rsvps.push(data);
    }
    localStorage.setItem('bruiloft_rsvps', JSON.stringify(rsvps));
}

function getRSVPs() {
    const stored = localStorage.getItem('bruiloft_rsvps');
    return stored ? JSON.parse(stored) : [];
}
