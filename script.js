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

    document.getElementById('days').textContent = days;
    document.getElementById('hours').textContent = hours;
    document.getElementById('minutes').textContent = minutes;
    document.getElementById('seconds').textContent = seconds;
}

updateCountdown();
setInterval(updateCountdown, 1000);

// ============================================
// Navigation
// ============================================
const navbar = document.getElementById('navbar');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

// Sticky nav on scroll
window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu toggle
navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
});

// Close mobile menu on link click
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('active');
    });
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = navbar.offsetHeight;
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
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

animateElements.forEach(el => observer.observe(el));

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
            extraFields.style.maxHeight = extraFields.scrollHeight + 'px';
        } else {
            extraFields.classList.add('hidden');
            extraFields.style.maxHeight = '0';
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
    }, 1000);
});

// ============================================
// RSVP Storage (localStorage)
// ============================================
function saveRSVP(data) {
    const rsvps = getRSVPs();
    // Check if this email already submitted and update
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
