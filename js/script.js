/* =========================================================================
   GETECH — Media Tech
   Vanilla JS. No dependencies, no build step.

   Modules
     initPreloader()      initReveal()        initParticles()
     initHeader()         initCounters()      initToTop()
     initMobileMenu()     initParallax()      initComingSoon()
     initScrollSpy()      initLanguage()      initMotion2D()

   The cinematic 3D film (WebGL, smooth scroll, GSAP timeline) lives in
   js/motion3d.js. This file stays the no-dependency baseline.
   ========================================================================= */

'use strict';

/* -------------------------------------------------------------------------
   TRANSLATIONS
   Add a language by adding a key here and a button in the header.
   Any element carrying data-i18n="key" is swapped automatically.
   ------------------------------------------------------------------------- */
const translations = {
    vi: {
        'nav.home':        'TRANG CHỦ',
        'nav.about':       'VỀ CHÚNG TÔI',
        'nav.services':    'DỊCH VỤ',
        'nav.news':        'TIN TỨC',
        'nav.contact':     'LIÊN HỆ',
        'nav.cta':         'HỢP TÁC',

        'hero.eyebrow':    'MEDIA TECH COMPANY — VIỆT NAM',
        'hero.kicker':     'MEDIA × TECHNOLOGY × CREATIVITY',
        'hero.lead':       'Kết nối công nghệ và sáng tạo để tạo nên những sản phẩm âm nhạc, giải trí và trải nghiệm số có sức lan tỏa từ Việt Nam đến thị trường quốc tế.',
        'hero.cta1':       'EXPLORE GETECH',
        'hero.cta2':       'CONTACT US',
        'hero.scroll':     'CUỘN XUỐNG',

        'about.eyebrow':   'VỀ CHÚNG TÔI',
        'about.title':     'THƯƠNG HIỆU MEDIA TECH<br>TỪ VIỆT NAM RA THẾ GIỚI',
        'about.body':      'Tại GETECH, chúng tôi hướng tới xây dựng một thương hiệu Media Tech uy tín trong lĩnh vực truyền thông và sáng tạo nội dung số — kết nối công nghệ và sáng tạo để tạo nên những sản phẩm âm nhạc, giải trí và trải nghiệm số chất lượng, giàu giá trị và có sức lan tỏa.',
        'pill.tech':       'CÔNG NGHỆ',
        'pill.media':      'TRUYỀN THÔNG',
        'pill.music':      'ÂM NHẠC',
        'pill.ent':        'GIẢI TRÍ',
        'pill.content':    'NỘI DUNG SỐ',

        'services.eyebrow':'DỊCH VỤ',
        'services.title':  'WHAT WE DO',
        'svc.music':       'SẢN XUẤT VÀ PHÂN PHỐI ÂM NHẠC',
        'svc.media':       'PHÁT HÀNH, QUẢNG BÁ VÀ TRUYỀN THÔNG',
        'svc.content':     'SÁNG TẠO NỘI DUNG VỚI ĐA DẠNG CHỦ ĐỀ SẢN PHẨM',

        'stats.eyebrow':   'HỆ SINH THÁI',
        'stats.title':     'HỆ THỐNG MẠNG XÃ HỘI ĐA DẠNG<br>TRÊN NHIỀU NỀN TẢNG',
        'stat.views':      'LƯỢT XEM',
        'stat.channels':   'KÊNH',
        'stat.followers':  'ĐĂNG KÝ, THEO DÕI',
        'stat.songs':      'BÀI HÁT',
        'stat.artists':    'NGHỆ SĨ',

        'partners.eyebrow':'ĐỐI TÁC',
        'partners.title':  'OUR PARTNERS',

        'news.eyebrow':    'TIN TỨC',
        'news.title':      'LATEST NEWS',
        'news.all':        'XEM TẤT CẢ',
        'news.cat1':       'VĂN PHÒNG',
        'news.cat2':       'ĐỘI NGŨ',
        'news.cat3':       'HỢP TÁC',

        'cta.eyebrow':     'LIÊN HỆ',
        'cta.title':       'HÃY CÙNG TẠO NÊN<br>ĐIỀU GÌ ĐÓ LAN TỎA',
        'cta.text':        'Bạn có một dự án âm nhạc, một chiến dịch truyền thông hay một ý tưởng nội dung số? Hãy nói chuyện với chúng tôi.',
        'cta.btn2':        'TẢI HỒ SƠ NĂNG LỰC',

        'footer.explore':  'KHÁM PHÁ',
        'footer.follow':   'THEO DÕI',
        'footer.made':     'Media Tech Company — Việt Nam',

        'ui.soon':         'Nội dung đang được hoàn thiện. Coming soon.',
        'ui.menuOpen':     'Mở menu',
        'ui.menuClose':    'Đóng menu'
    },

    en: {
        'nav.home':        'HOME',
        'nav.about':       'ABOUT',
        'nav.services':    'SERVICES',
        'nav.news':        'NEWS',
        'nav.contact':     'CONTACT',
        'nav.cta':         'GET IN TOUCH',

        'hero.eyebrow':    'MEDIA TECH COMPANY — VIETNAM',
        'hero.kicker':     'MEDIA × TECHNOLOGY × CREATIVITY',
        'hero.lead':       'Connecting technology and creativity to build music, entertainment and digital experiences that travel from Vietnam to the world.',
        'hero.cta1':       'EXPLORE GETECH',
        'hero.cta2':       'CONTACT US',
        'hero.scroll':     'SCROLL',

        'about.eyebrow':   'ABOUT US',
        'about.title':     'A MEDIA TECH BRAND<br>BUILT IN VIETNAM',
        'about.body':      'At GETECH we are building a trusted Media Tech brand across communications and digital content — joining technology with creativity to craft music, entertainment and digital experiences that carry real value and real reach.',
        'pill.tech':       'TECHNOLOGY',
        'pill.media':      'MEDIA',
        'pill.music':      'MUSIC',
        'pill.ent':        'ENTERTAINMENT',
        'pill.content':    'DIGITAL CONTENT',

        'services.eyebrow':'SERVICES',
        'services.title':  'WHAT WE DO',
        'svc.music':       'MUSIC PRODUCTION AND DISTRIBUTION',
        'svc.media':       'RELEASE, PROMOTION AND COMMUNICATIONS',
        'svc.content':     'CONTENT CREATION ACROSS DIVERSE FORMATS',

        'stats.eyebrow':   'OUR ECOSYSTEM',
        'stats.title':     'A SOCIAL MEDIA NETWORK<br>ACROSS EVERY PLATFORM',
        'stat.views':      'VIEWS',
        'stat.channels':   'CHANNELS',
        'stat.followers':  'FOLLOWERS',
        'stat.songs':      'SONGS',
        'stat.artists':    'ARTISTS',

        'partners.eyebrow':'PARTNERS',
        'partners.title':  'OUR PARTNERS',

        'news.eyebrow':    'NEWSROOM',
        'news.title':      'LATEST NEWS',
        'news.all':        'VIEW ALL',
        'news.cat1':       'OFFICE',
        'news.cat2':       'TEAM',
        'news.cat3':       'PARTNERSHIP',

        'cta.eyebrow':     'CONTACT',
        'cta.title':       'LET US BUILD<br>SOMETHING THAT TRAVELS',
        'cta.text':        'Have a music project, a campaign or a digital content idea? Let us talk.',
        'cta.btn2':        'DOWNLOAD PROFILE',

        'footer.explore':  'EXPLORE',
        'footer.follow':   'FOLLOW',
        'footer.made':     'Media Tech Company — Vietnam',

        'ui.soon':         'This section is on the way. Coming soon.',
        'ui.menuOpen':     'Open menu',
        'ui.menuClose':    'Close menu'
    }
};

/* -------------------------------------------------------------------------
   SHARED HELPERS
   ------------------------------------------------------------------------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const prefersReducedMotion = () => motionQuery.matches;

/** True while js/motion3d.js owns the hero (class set in <head>). */
const has3d = () => document.documentElement.classList.contains('has-3d');

/** Current language — read once, kept in sync by initLanguage(). */
let currentLang = 'vi';
const t = (key) => (translations[currentLang] && translations[currentLang][key]) || key;

/** Run a callback at most once per animation frame. */
function onFrame(callback) {
    let ticking = false;
    return (...args) => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            callback(...args);
        });
    };
}

/* -------------------------------------------------------------------------
   PRELOADER
   ------------------------------------------------------------------------- */
function initPreloader() {
    const preloader = $('#preloader');
    if (!preloader) return;

    const dismiss = () => preloader.classList.add('is-done');

    // 3D mode: lift once the WebGL scene is up (or has given up), so the
    // intro plays as the curtain opens instead of behind it.
    if (has3d()) {
        if (window.__motionState) {
            dismiss();
        } else {
            document.addEventListener('motion:ready', dismiss, { once: true });
            document.addEventListener('motion:fallback', dismiss, { once: true });
            setTimeout(dismiss, 5000);
        }
        return;
    }

    if (document.readyState === 'complete') {
        dismiss();
    } else {
        window.addEventListener('load', dismiss, { once: true });
        // Never let a slow asset hold the page hostage
        setTimeout(dismiss, 2500);
    }
}

/* -------------------------------------------------------------------------
   HEADER
   Glass background past the hero + hide on scroll down, reveal on scroll up.
   ------------------------------------------------------------------------- */
function initHeader() {
    const header = $('#header');
    if (!header) return;

    let lastY = window.scrollY;

    const update = onFrame(() => {
        const y = window.scrollY;

        header.classList.toggle('is-scrolled', y > 40);

        // Keep the header pinned while the mobile menu is open
        const menuOpen = document.body.classList.contains('is-locked');
        const scrollingDown = y > lastY && y > 320;
        header.classList.toggle('is-hidden', scrollingDown && !menuOpen);

        lastY = y;
    });

    window.addEventListener('scroll', update, { passive: true });
    update();
}

/* -------------------------------------------------------------------------
   MOBILE MENU
   ------------------------------------------------------------------------- */
function initMobileMenu() {
    const burger = $('#burger');
    const menu   = $('#mobileMenu');
    if (!burger || !menu) return;

    const setOpen = (open) => {
        burger.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? t('ui.menuClose') : t('ui.menuOpen'));
        menu.classList.toggle('is-open', open);
        menu.setAttribute('aria-hidden', String(!open));
        document.body.classList.toggle('is-locked', open);
    };

    burger.addEventListener('click', () => {
        setOpen(!menu.classList.contains('is-open'));
    });

    // Close before the browser jumps to the anchor, so the page can scroll
    $$('a', menu).forEach((link) => link.addEventListener('click', () => setOpen(false)));

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && menu.classList.contains('is-open')) {
            setOpen(false);
            burger.focus();
        }
    });

    // Leaving mobile widths must never strand the page in a locked state
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (event) => {
        if (event.matches) setOpen(false);
    });
}

/* -------------------------------------------------------------------------
   SCROLL SPY — active navigation state
   ------------------------------------------------------------------------- */
function initScrollSpy() {
    const links = $$('.nav__link');
    if (!links.length) return;

    const byId = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]));
    const sections = $$('main section[id]').filter((section) => byId.has(section.id));
    if (!sections.length) return;

    const setActive = (id) => {
        links.forEach((link) => {
            const active = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('is-active', active);
            if (active) {
                link.setAttribute('aria-current', 'true');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    };

    const observer = new IntersectionObserver((entries) => {
        // The section occupying the most of the upper viewport wins
        const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
    }, { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 1] });

    sections.forEach((section) => observer.observe(section));
}

/* -------------------------------------------------------------------------
   LANGUAGE SWITCHER
   ------------------------------------------------------------------------- */
function initLanguage() {
    const buttons = $$('[data-lang-btn]');
    if (!buttons.length) return;

    const apply = (lang) => {
        if (!translations[lang]) return;
        currentLang = lang;

        $$('[data-i18n]').forEach((node) => {
            const value = translations[lang][node.dataset.i18n];
            if (value === undefined) return;
            // Only our own translation strings carry markup (line breaks)
            if (value.includes('<')) {
                node.innerHTML = value;
            } else {
                node.textContent = value;
            }
        });

        document.documentElement.lang = lang;
        document.documentElement.dataset.lang = lang;

        buttons.forEach((button) => {
            const active = button.dataset.langBtn === lang;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', String(active));
        });

        // Keep the burger's label in the chosen language
        const burger = $('#burger');
        if (burger) {
            const open = burger.getAttribute('aria-expanded') === 'true';
            burger.setAttribute('aria-label', open ? t('ui.menuClose') : t('ui.menuOpen'));
        }

        try { localStorage.setItem('getech-lang', lang); } catch (_) { /* private mode */ }
    };

    buttons.forEach((button) => {
        button.addEventListener('click', () => apply(button.dataset.langBtn));
    });

    let saved = null;
    try { saved = localStorage.getItem('getech-lang'); } catch (_) { /* private mode */ }
    apply(saved && translations[saved] ? saved : 'vi');
}

/* -------------------------------------------------------------------------
   SCROLL REVEAL
   ------------------------------------------------------------------------- */
function initReveal() {
    const items = $$('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
        items.forEach((item) => item.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);          // reveal once, then stop watching
        });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    items.forEach((item) => observer.observe(item));
}

/* -------------------------------------------------------------------------
   COUNTERS
   ------------------------------------------------------------------------- */
function initCounters() {
    const counters = $$('[data-count]');
    if (!counters.length) return;

    const run = (el) => {
        const target   = parseFloat(el.dataset.count) || 0;
        const suffix   = el.dataset.suffix || '';
        const duration = 1500;

        if (prefersReducedMotion()) {
            el.textContent = target + suffix;
            return;
        }

        const start = performance.now();
        const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            // easeOutExpo — lands softly instead of stopping dead
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            el.textContent = Math.round(target * eased) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
        counters.forEach(run);
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            run(entry.target);
            obs.unobserve(entry.target);          // count once per visit
        });
    }, { threshold: 0.4 });

    counters.forEach((counter) => observer.observe(counter));
}

/* -------------------------------------------------------------------------
   HERO PARALLAX
   Background and content drift at different rates for depth.
   ------------------------------------------------------------------------- */
function initParallax() {
    const layers = $$('[data-parallax]');
    if (!layers.length || prefersReducedMotion()) return;

    const hero = $('.hero');
    let active = true;

    if (hero && 'IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => { active = entry.isIntersecting; })
            .observe(hero);
    }

    const update = onFrame(() => {
        if (!active) return;
        const y = window.scrollY;
        layers.forEach((layer) => {
            const rate = parseFloat(layer.dataset.parallax) || 0;
            // translate3d keeps this on the compositor, off the main thread
            layer.style.transform = `translate3d(0, ${(y * rate).toFixed(2)}px, 0)`;
        });
    });

    window.addEventListener('scroll', update, { passive: true });
    update();
}

/* -------------------------------------------------------------------------
   HERO PARTICLES
   A light digital-dust field. Decorative only — skipped entirely when the
   user asks for reduced motion, and paused whenever the hero is off screen.
   ------------------------------------------------------------------------- */
function initParticles() {
    const canvas = $('#particles');
    if (!canvas || prefersReducedMotion()) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles = [];
    let frameId = null;
    let running = true;

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        width  = rect.width;
        height = rect.height;
        canvas.width  = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Density scales with area, capped so phones stay smooth
        const count = Math.min(Math.round((width * height) / 16000), 90);
        particles = Array.from({ length: count }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.6 + 0.5,
            vx: (Math.random() - 0.5) * 0.16,
            vy: (Math.random() - 0.5) * 0.16,
            a: Math.random() * 0.45 + 0.15
        }));
    };

    const draw = () => {
        ctx.clearRect(0, 0, width, height);

        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;

            // Wrap around the edges so the field never thins out
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            if (p.y < -10) p.y = height + 10;
            if (p.y > height + 10) p.y = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(150, 205, 255, ${p.a})`;
            ctx.fill();
        }

        frameId = requestAnimationFrame(draw);
    };

    const start = () => {
        if (running) return;
        running = true;
        frameId = requestAnimationFrame(draw);
    };
    const stop = () => {
        running = false;
        if (frameId) cancelAnimationFrame(frameId);
        frameId = null;
    };

    resize();
    frameId = requestAnimationFrame(draw);

    window.addEventListener('resize', onFrame(resize), { passive: true });

    // Do not burn frames on a hero nobody is looking at
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
            entry.isIntersecting ? start() : stop();
        }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener('visibilitychange', () => {
        document.hidden ? stop() : start();
    });
}

/* -------------------------------------------------------------------------
   SCROLL TO TOP
   ------------------------------------------------------------------------- */
function initToTop() {
    const button = $('#toTop');
    if (!button) return;

    const update = onFrame(() => {
        button.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8);
    });

    window.addEventListener('scroll', update, { passive: true });

    button.addEventListener('click', () => {
        if (window.__lenis) {
            window.__lenis.scrollTo(0, { duration: 1.4 });
            return;
        }
        window.scrollTo({
            top: 0,
            behavior: prefersReducedMotion() ? 'auto' : 'smooth'
        });
    });

    update();
}

/* -------------------------------------------------------------------------
   "COMING SOON" TOASTS
   Any link marked data-soon answers with a toast instead of a dead page.
   ------------------------------------------------------------------------- */
function initComingSoon() {
    const region = $('#toasts');
    if (!region) return;

    let last = 0;

    const toast = (message) => {
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = message;
        region.appendChild(el);

        // Force a frame so the entry transition actually plays
        requestAnimationFrame(() => el.classList.add('is-in'));

        setTimeout(() => {
            el.classList.remove('is-in');
            setTimeout(() => el.remove(), 320);
        }, 3200);
    };

    $$('[data-soon]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const now = Date.now();
            if (now - last < 600) return;   // no toast spam on rapid clicks
            last = now;
            toast(t('ui.soon'));
        });
    });
}

/* -------------------------------------------------------------------------
   2D MOTION (parallax, particles, counters, scroll spy)
   Runs when 3D is off, or later if js/motion3d.js reports a failure.
   In 3D mode the film timeline drives all of these instead.
   ------------------------------------------------------------------------- */
function initMotion2D() {
    const run = () => {
        initParallax();
        initParticles();
        initCounters();
        initScrollSpy();
    };

    if (!has3d() || window.__motionState === 'fallback') {
        run();
    } else {
        document.addEventListener('motion:fallback', run, { once: true });
    }
}

/* -------------------------------------------------------------------------
   BOOT
   ------------------------------------------------------------------------- */
function init() {
    initPreloader();
    initLanguage();
    initHeader();
    initMobileMenu();
    initReveal();
    initMotion2D();
    initToTop();
    initComingSoon();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
