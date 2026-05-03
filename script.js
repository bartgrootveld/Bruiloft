// ============================================
// Countdown
// ============================================
(function () {
    var target = new Date('2027-04-24T16:30:00+02:00').getTime();
    var els = {
        d: document.getElementById('cd-days'),
        h: document.getElementById('cd-hours'),
        m: document.getElementById('cd-minutes'),
        s: document.getElementById('cd-seconds'),
    };
    if (!els.d) return;

    function pad(n) { return String(n).padStart(2, '0'); }
    function tick() {
        var diff = Math.max(0, target - Date.now());
        var days = Math.floor(diff / 86400000);
        var hours = Math.floor((diff % 86400000) / 3600000);
        var minutes = Math.floor((diff % 3600000) / 60000);
        var seconds = Math.floor((diff % 60000) / 1000);
        if (els.d.textContent !== String(days)) els.d.textContent = days;
        if (els.h.textContent !== pad(hours)) els.h.textContent = pad(hours);
        if (els.m.textContent !== pad(minutes)) els.m.textContent = pad(minutes);
        if (els.s.textContent !== pad(seconds)) els.s.textContent = pad(seconds);
    }
    tick();
    setInterval(tick, 1000);
})();

// ============================================
// Sticky nav + mobile menu + smooth scroll
// ============================================
(function () {
    var navbar = document.getElementById('navbar');
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.querySelector('.nav-menu');

    var ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
            navbar.classList.toggle('scrolled', window.scrollY > 60);
            ticking = false;
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toggle && menu) {
        toggle.addEventListener('click', function () {
            var open = menu.classList.toggle('is-open');
            toggle.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            document.body.style.overflow = open ? 'hidden' : '';
        });
        menu.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () {
                menu.classList.remove('is-open');
                toggle.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var id = a.getAttribute('href');
            if (!id || id === '#') return;
            var target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            var offset = (navbar ? navbar.offsetHeight : 0) + 8;
            var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top: top, behavior: 'smooth' });
        });
    });
})();

// ============================================
// Reveal on scroll
// ============================================
(function () {
    var els = document.querySelectorAll('[data-animate]');
    if (!('IntersectionObserver' in window)) {
        els.forEach(function (el) { el.classList.add('is-visible'); });
        return;
    }
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
})();

// ============================================
// Programma - day tabs + content
// ============================================
(function () {
    var DAYS = [
        {
            weekday: 'Zaterdag', date: '24 APR', label: '2027',
            name: 'We trappen af', spanish: 'Bienvenidos', time: '16:30',
            dresscode: 'Spanish Summer Chique',
            dressNote: 'Hoe feller, hoe beter. Rood, blauw, groen — je snapt \u2019m \uD83D\uDE09',
            palette: ['#d94b3a', '#2e7bbd', '#3aa86e', '#e8a93b'],
            body: 'Vanaf 16:30 begint het feest. We starten meteen goed met een Spaanse avond \u2014 denk: lekker eten, drankjes en veel gezelligheid. Alles is geregeld, jullie hoeven alleen maar te komen en te genieten.',
            moments: ['16:30 \u00b7 Welkom met cava', '18:00 \u00b7 Tapas-tafel', '21:00 \u00b7 Spaanse avond'],
            accent: 'var(--pastel-peach)', icon: 'sun',
            tag: 'lekker beginnen',
        },
        {
            weekday: 'Zondag', date: '25 APR', label: '2027',
            name: 'De grote dag', spanish: 'El gran d\u00eda', time: '16:30',
            dresscode: 'Pastel',
            dressNote: 'Zachte tinten \u2014 perzik, salie, poederroze, lila, lichtblauw, boterzacht geel.',
            palette: ['var(--pastel-peach)', 'var(--pastel-sage)', 'var(--pastel-rose)', 'var(--pastel-sky)', 'var(--pastel-butter)'],
            body: 'We beginnen relaxed met samen ontbijten en lunchen. Tussendoor is er alle tijd om te chillen bij het zwembad of je rustig klaar te maken. Om 16:30 is het zover: dan geven we elkaar het ja-woord. Daarna dineren we samen \u2014 en natuurlijk door met een goed feest.',
            moments: ['10:00 \u00b7 Ontbijt & lunch', '15:00 \u00b7 Pool & klaarmaken', '16:30 \u00b7 Het ja-woord', '19:30 \u00b7 Diner', '22:00 \u00b7 Feest'],
            accent: 'var(--pastel-rose)', icon: 'rings',
            tag: 'het hoogtepunt',
        },
        {
            weekday: 'Maandag', date: '26 APR', label: '2027',
            name: 'Bijkomen (of juist niet)', spanish: 'La resaca', time: 'all day',
            dresscode: 'Comfortable beachwear',
            dressNote: 'Slippers welkom. Zonnebril verplicht.',
            palette: ['#f0dfa8', '#c2cfd6', '#f4cdb8'],
            body: 'Samen ontbijten en lunchen, daarna alles in het teken van ontspannen bij het zwembad van Fuente del Sol. We maken er een poolparty van, met een relaxte sfeer en een goede (licht brakke \uD83D\uDE09) BBQ.',
            moments: ['10:00 \u00b7 Slow ontbijt', '13:00 \u00b7 Poolparty', '17:00 \u00b7 BBQ'],
            accent: 'var(--pastel-butter)', icon: 'pool',
            tag: 'genieten en drijven',
        },
        {
            weekday: 'Dinsdag', date: '27 APR', label: '2027',
            name: 'Afsluiten', spanish: 'Hasta luego', time: '09:00',
            dresscode: 'Wat je aanhebt',
            dressNote: 'Een glimlach is voldoende.',
            palette: ['var(--pastel-sage)', 'var(--pastel-peach)'],
            body: 'We sluiten samen af met een ontbijt, waarna iedereen weer rustig zijn eigen weg gaat \u2014 hopelijk met een paar mooie herinneringen (en misschien een klein beetje spierpijn van het dansen).',
            moments: ['09:00 \u00b7 Ontbijt', '11:00 \u00b7 Vaarwel'],
            accent: 'var(--pastel-sage)', icon: 'wave',
            tag: 'een zachte landing',
        },
    ];

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function iconSvg(kind, color) {
        var stroke = 'var(--ink)';
        var sw = 1.2;
        if (kind === 'sun') {
            var rays = '';
            for (var i = 0; i < 8; i++) {
                var a = (i * Math.PI) / 4;
                var x1 = 30 + Math.cos(a) * 16, y1 = 30 + Math.sin(a) * 16;
                var x2 = 30 + Math.cos(a) * 22, y2 = 30 + Math.sin(a) * 22;
                rays += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
            }
            return '<svg viewBox="0 0 60 60" width="60" height="60"><circle cx="30" cy="30" r="10" fill="' + color + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>' + rays + '</svg>';
        }
        if (kind === 'rings') {
            return '<svg viewBox="0 0 60 60" width="60" height="60">' +
                '<circle cx="22" cy="32" r="13" fill="none" stroke="' + stroke + '" stroke-width="' + sw + '"/>' +
                '<circle cx="38" cy="32" r="13" fill="' + color + '" stroke="' + stroke + '" stroke-width="' + sw + '" fill-opacity="0.6"/>' +
                '<path d="M22 18 L24 14 L20 14 Z" fill="' + stroke + '"/>' +
                '<path d="M38 18 L40 14 L36 14 Z" fill="' + stroke + '"/></svg>';
        }
        if (kind === 'pool') {
            return '<svg viewBox="0 0 60 60" width="60" height="60">' +
                '<rect x="10" y="22" width="40" height="22" rx="3" fill="' + color + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>' +
                '<path d="M10 32 Q 20 28, 30 32 T 50 32" stroke="' + stroke + '" stroke-width="' + sw + '" fill="none"/>' +
                '<path d="M10 38 Q 20 34, 30 38 T 50 38" stroke="' + stroke + '" stroke-width="' + sw + '" fill="none"/>' +
                '<line x1="14" y1="22" x2="14" y2="14" stroke="' + stroke + '" stroke-width="' + sw + '"/>' +
                '<line x1="46" y1="22" x2="46" y2="14" stroke="' + stroke + '" stroke-width="' + sw + '"/>' +
                '<circle cx="14" cy="13" r="2" fill="' + stroke + '"/>' +
                '<circle cx="46" cy="13" r="2" fill="' + stroke + '"/></svg>';
        }
        if (kind === 'wave') {
            return '<svg viewBox="0 0 60 60" width="60" height="60">' +
                '<path d="M6 26 Q 16 18, 26 26 T 46 26 T 56 26" fill="none" stroke="' + stroke + '" stroke-width="' + sw + '"/>' +
                '<path d="M6 36 Q 16 28, 26 36 T 46 36 T 56 36" fill="none" stroke="' + stroke + '" stroke-width="' + sw + '"/>' +
                '<path d="M6 46 Q 16 38, 26 46 T 46 46 T 56 46" fill="' + color + '" stroke="' + stroke + '" stroke-width="' + sw + '" fill-opacity="0.6"/></svg>';
        }
        return '';
    }

    var card = document.getElementById('day-card');
    var tabs = document.querySelectorAll('.day-tab');
    if (!card || !tabs.length) return;

    function render(idx) {
        var d = DAYS[idx];
        var moments = d.moments.map(function (m, i) {
            return '<div class="day-card-moment">' +
                '<div class="day-card-moment-num">' + String(i + 1).padStart(2, '0') + '</div>' +
                '<div class="day-card-moment-text">' + escapeHtml(m) + '</div>' +
                '</div>';
        }).join('');
        var chips = d.palette.map(function (c) {
            return '<div class="day-card-chip" style="background:' + c + '"></div>';
        }).join('');

        card.innerHTML =
            '<div class="day-card-blob" style="background:' + d.accent + '"></div>' +
            '<div class="day-card-inner">' +
                '<div>' +
                    '<div class="day-card-meta">' +
                        '<div class="day-card-icon">' + iconSvg(d.icon, d.accent) + '</div>' +
                        '<div class="day-card-meta-text">' +
                            '<div class="eyebrow">' + d.weekday.toUpperCase() + ' \u00b7 ' + d.date + ' ' + d.label + '</div>' +
                            '<div class="day-card-spanish">' + escapeHtml(d.spanish) + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<h3 class="day-card-title">' + escapeHtml(d.name) + '</h3>' +
                    '<p class="day-card-body">' + escapeHtml(d.body) + '</p>' +
                    '<div class="day-card-moments">' + moments + '</div>' +
                '</div>' +
                '<div class="day-card-side">' +
                    '<div class="eyebrow">Dresscode</div>' +
                    '<div class="day-card-dresscode">' + escapeHtml(d.dresscode) + '</div>' +
                    '<div class="day-card-dressnote">' + escapeHtml(d.dressNote) + '</div>' +
                    '<div style="margin-top:30px"><div class="eyebrow">Palette</div>' +
                    '<div class="day-card-palette">' + chips + '</div></div>' +
                    '<div class="day-card-time">' +
                        '<span class="eyebrow">Start</span>' +
                        '<span class="day-card-time-value">' + escapeHtml(d.time) + '</span>' +
                    '</div>' +
                    '<div class="day-card-tag">Dag ' + (idx + 1) + ' van 4 \u2014 <span class="day-card-tag-accent">' + escapeHtml(d.tag) + '</span>.</div>' +
                '</div>' +
            '</div>';
    }

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            var idx = parseInt(tab.getAttribute('data-day'), 10);
            tabs.forEach(function (t) {
                var active = t === tab;
                t.classList.toggle('is-active', active);
                t.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            render(idx);
        });
    });

    // Initial: 25 APR (index 1) is pre-marked active
    render(1);
})();

// ============================================
// RSVP - multi-step form
// ============================================
(function () {
    var form = document.getElementById('rsvp-form');
    var success = document.getElementById('rsvp-success');
    if (!form) return;

    var steps = form.querySelectorAll('.rsvp-step');
    var counterEl = document.getElementById('rsvp-step-counter');
    var nameEl = document.getElementById('rsvp-step-name');
    var fillEl = document.getElementById('rsvp-progress-fill');
    var prevBtn = document.getElementById('rsvp-prev');
    var nextBtn = document.getElementById('rsvp-next');
    var submitBtn = document.getElementById('rsvp-submit');

    var STEP_NAMES = ['Wie', 'Aanwezig', 'Speech', 'Details'];
    var current = 0;

    function setStep(i) {
        current = Math.max(0, Math.min(steps.length - 1, i));
        steps.forEach(function (s, idx) {
            s.classList.toggle('is-active', idx === current);
        });
        counterEl.textContent = 'Stap ' + (current + 1) + ' / ' + steps.length;
        nameEl.textContent = STEP_NAMES[current];
        fillEl.style.right = (100 - (current / (steps.length - 1)) * 100) + '%';

        prevBtn.disabled = current === 0;
        var last = current === steps.length - 1;
        nextBtn.hidden = last;
        submitBtn.hidden = !last;
        updateNextEnabled();
    }

    function canAdvance() {
        if (current === 0) {
            var name = form.naam.value.trim();
            var email = form.email.value.trim();
            return name.length > 0 && /\S+@\S+\.\S+/.test(email);
        }
        if (current === 1) {
            return !!form.querySelector('input[name="aanwezig"]:checked');
        }
        if (current === 2) {
            return !!form.querySelector('input[name="speech"]:checked');
        }
        return true;
    }
    function updateNextEnabled() {
        nextBtn.disabled = !canAdvance();
    }

    form.addEventListener('input', updateNextEnabled);
    form.addEventListener('change', updateNextEnabled);

    prevBtn.addEventListener('click', function () { setStep(current - 1); });
    nextBtn.addEventListener('click', function () {
        if (!canAdvance()) return;
        // Skip step 2 (speech) als ze niet komen
        if (current === 1 && form.querySelector('input[name="aanwezig"]:checked').value === 'nee') {
            setStep(steps.length - 1);
            return;
        }
        setStep(current + 1);
    });

    function showError(message) {
        var existing = document.getElementById('rsvp-error');
        if (existing) existing.remove();
        var box = document.createElement('div');
        box.id = 'rsvp-error';
        box.setAttribute('role', 'alert');
        box.style.cssText = 'margin-top:18px;padding:14px 16px;border-radius:10px;background:#fbe9e1;color:#7a2c14;font-size:14px;line-height:1.5;';
        box.textContent = message;
        form.querySelector('.rsvp-nav').insertAdjacentElement('beforebegin', box);
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        var data = {
            naam: form.naam.value.trim(),
            email: form.email.value.trim(),
            aanwezig: (form.querySelector('input[name="aanwezig"]:checked') || {}).value || null,
            speech: (form.querySelector('input[name="speech"]:checked') || {}).value || null,
            dieet: form.dieet.value.trim(),
            bijzonderheden: form.bijzonderheden.value.trim(),
            bericht: form.bericht.value.trim(),
            website: (form.website && form.website.value) || '', // honeypot
            timestamp: new Date().toISOString(),
        };

        // Lokale backup (blijft staan als netwerk faalt).
        try {
            var stored = JSON.parse(localStorage.getItem('bruiloft_rsvps') || '[]');
            var idx = stored.findIndex(function (r) { return r.email === data.email; });
            if (idx >= 0) stored[idx] = data; else stored.push(data);
            localStorage.setItem('bruiloft_rsvps', JSON.stringify(stored));
        } catch (err) { /* ignore */ }

        var existingError = document.getElementById('rsvp-error');
        if (existingError) existingError.remove();

        var originalLabel = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Versturen…';

        fetch('/api/rsvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
            .then(function (resp) {
                return resp.json().then(function (json) {
                    return { ok: resp.ok, status: resp.status, json: json };
                }).catch(function () {
                    return { ok: resp.ok, status: resp.status, json: {} };
                });
            })
            .then(function (result) {
                if (!result.ok) {
                    throw new Error(result.json.error || 'Er ging iets mis (' + result.status + ').');
                }

                var msg = document.getElementById('rsvp-success-message');
                if (data.aanwezig === 'nee') {
                    msg.textContent = 'Jammer dat jullie er niet bij kunnen zijn — bedankt voor het laten weten. We zullen jullie missen!';
                } else {
                    msg.textContent = 'Geweldig ' + (data.naam || '') + '! We hebben jullie antwoord ontvangen. Je krijgt zo een bevestiging per mail — en daarna gaan we aftellen tot Málaga.';
                }

                form.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                form.style.opacity = '0';
                form.style.transform = 'translateY(-10px)';
                setTimeout(function () {
                    form.hidden = true;
                    success.hidden = false;
                    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 420);
            })
            .catch(function (err) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalLabel;
                showError((err && err.message) || 'Er ging iets mis. Probeer het opnieuw of mail ons direct.');
            });
    });

    setStep(0);
})();
