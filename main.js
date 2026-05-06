/* ============================================
   ARKZONE — Main JavaScript
   Scroll-Driven Frame Animation (Apple-style)
   ============================================ */

(function () {
  'use strict';

  // ─── CONFIG ───────────────────────────────────────────────
  const FRAME_COUNT = 192;
  const FRAME_PREFIX = 'rasm/ezgif-frame-';
  const PRELOAD_BATCH = 16; // frames to preload at once

  // ─── ELEMENTS ─────────────────────────────────────────────
  const canvas = document.getElementById('heroCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loaderBar');
  const loaderPercent = document.getElementById('loaderPercent');
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const particlesContainer = document.getElementById('particles');
  const contactForm = document.getElementById('contactForm');
  const heroScrollContainer = document.getElementById('heroScrollContainer');

  // ─── STATE ────────────────────────────────────────────────
  const frames = new Array(FRAME_COUNT);
  let loadedCount = 0;
  let currentFrame = 0;
  let displayedFrame = -1; // avoid redundant redraws

  // ─── UTILITY ──.────────────────────────────────────────────
  function padNumber(num, len) {
    return String(num).padStart(len, '0');
  }

  function getFramePath(index) {
    return `${FRAME_PREFIX}${padNumber(index + 1, 3)}.jpg`;
  }

  // ─── CANVAS SIZING ───────────────────────────────────────
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    displayedFrame = -1; // force redraw
    drawFrame(currentFrame);
  }

  function drawFrame(index) {
    const img = frames[index];
    if (!img || !img.complete || index === displayedFrame) return;
    displayedFrame = index;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = cw / ch;
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

    if (imgRatio > canvasRatio) {
      sw = img.naturalHeight * canvasRatio;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sh = img.naturalWidth / canvasRatio;
      sy = (img.naturalHeight - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  }

  // ─── FRAME LOADING ───────────────────────────────────────
  function loadFrame(index) {
    return new Promise((resolve) => {
      if (frames[index]) {
        resolve(frames[index]);
        return;
      }
      const img = new Image();
      img.onload = () => {
        frames[index] = img;
        loadedCount++;
        updateLoaderProgress();
        resolve(img);
      };
      img.onerror = () => {
        loadedCount++;
        updateLoaderProgress();
        resolve(null);
      };
      img.src = getFramePath(index);
    });
  }

  function updateLoaderProgress() {
    const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
    loaderBar.style.width = pct + '%';
    loaderPercent.textContent = pct + '%';
  }

  async function preloadFrames() {
    for (let i = 0; i < FRAME_COUNT; i += PRELOAD_BATCH) {
      const batch = [];
      for (let j = i; j < Math.min(i + PRELOAD_BATCH, FRAME_COUNT); j++) {
        batch.push(loadFrame(j));
      }
      await Promise.all(batch);
    }
  }

  // ─── SCROLL-DRIVEN FRAME ANIMATION ───────────────────────
  function getScrollProgress() {
    const rect = heroScrollContainer.getBoundingClientRect();
    const scrollableHeight = heroScrollContainer.offsetHeight - window.innerHeight;
    // How far we've scrolled into the container
    const scrolled = -rect.top;
    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, scrolled / scrollableHeight));
  }

  function updateFrameFromScroll() {
    const progress = getScrollProgress();
    const targetFrame = Math.min(
      Math.floor(progress * FRAME_COUNT),
      FRAME_COUNT - 1
    );

    // Find nearest available frame
    let frameToShow = targetFrame;
    if (!frames[frameToShow]) {
      // Search nearby frames
      for (let offset = 1; offset < FRAME_COUNT; offset++) {
        if (frames[targetFrame - offset]) { frameToShow = targetFrame - offset; break; }
        if (frames[targetFrame + offset]) { frameToShow = targetFrame + offset; break; }
      }
    }

    if (frameToShow !== currentFrame) {
      currentFrame = frameToShow;
      drawFrame(currentFrame);
    }

    // Subtle parallax scale + translate based on scroll progress
    const scale = 1 + progress * 0.06;
    const translateX = Math.sin(progress * Math.PI) * 10;
    canvas.style.transform = `scale(${scale}) translateX(${translateX}px)`;

    // Fade hero content as user scrolls deeper
    const heroContent = document.querySelector('.hero-content');
    const heroScrollHint = document.querySelector('.hero-scroll-hint');
    if (heroContent) {
      const fadeStart = 0.08;
      const fadeEnd = 0.25;
      const opacity = progress <= fadeStart ? 1 :
        progress >= fadeEnd ? 0 :
          1 - ((progress - fadeStart) / (fadeEnd - fadeStart));
      heroContent.style.opacity = opacity;
      heroContent.style.transform = `translateY(${progress * 80}px)`;
    }
    if (heroScrollHint) {
      heroScrollHint.style.opacity = Math.max(0, 1 - progress * 8);
    }
  }

  // ─── RENDER LOOP (for scroll-driven updates) ──────────────
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateFrameFromScroll();
        handleNavScroll();
        updateActiveNav();
        revealOnScroll();
        animateCounters();
        ticking = false;
      });
      ticking = true;
    }
  }

  // ─── PARTICLES ────────────────────────────────────────────
  function createParticles() {
    const count = window.innerWidth < 768 ? 15 : 30;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'hero-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 8 + 's';
      particle.style.animationDuration = (6 + Math.random() * 6) + 's';
      particle.style.width = (1 + Math.random() * 2) + 'px';
      particle.style.height = particle.style.width;
      if (Math.random() > 0.6) {
        particle.style.background = '#6c5ce7';
      }
      particlesContainer.appendChild(particle);
    }
  }

  // ─── NAVBAR SCROLL ────────────────────────────────────────
  function handleNavScroll() {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  // ─── ACTIVE NAV LINK ─────────────────────────────────────
  function updateActiveNav() {
    const sections = document.querySelectorAll('.section, .hero');
    const links = document.querySelectorAll('.nav-link');
    let current = 'hero';

    sections.forEach((section) => {
      const top = section.offsetTop - 200;
      if (window.scrollY >= top) {
        current = section.id;
      }
    });

    links.forEach((link) => {
      link.classList.toggle('active', link.dataset.section === current);
    });
  }

  // ─── MOBILE NAV ───────────────────────────────────────────
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  // ─── SCROLL REVEAL ───────────────────────────────────────
  function revealOnScroll() {
    const elements = document.querySelectorAll('.reveal');
    const windowHeight = window.innerHeight;

    elements.forEach((el) => {
      const top = el.getBoundingClientRect().top;
      const triggerPoint = windowHeight * 0.88;
      if (top < triggerPoint) {
        el.classList.add('visible');
      }
    });
  }

  // ─── COUNTER ANIMATION ───────────────────────────────────
  function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    counters.forEach((counter) => {
      const target = parseInt(counter.dataset.target, 10);
      if (counter.dataset.animated === 'true') return;

      const rect = counter.getBoundingClientRect();
      if (rect.top > window.innerHeight) return;

      counter.dataset.animated = 'true';
      const duration = 2000;
      const start = performance.now();

      function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        counter.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    });
  }

  // ─── CONTACT FORM ────────────────────────────────────────
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.querySelector('span').textContent = 'Sent!';
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.7';
    setTimeout(() => {
      btn.querySelector('span').textContent = 'Send Message';
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      contactForm.reset();
    }, 3000);
  });

  // ─── SMOOTH ANCHOR SCROLL ────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ─── SCROLL LISTENER ─────────────────────────────────────
  window.addEventListener('scroll', onScroll, { passive: true });

  // ─── RESIZE ───────────────────────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 150);
  });

  // ─── INIT ─────────────────────────────────────────────────
  async function init() {
    resizeCanvas();
    createParticles();

    // Preload all frames
    await preloadFrames();

    // Draw first frame
    currentFrame = 0;
    drawFrame(0);

    // Hide loader
    loader.classList.add('hidden');

    // Set initial frame from current scroll position
    updateFrameFromScroll();

    // Initial reveals
    setTimeout(() => {
      revealOnScroll();
      animateCounters();
    }, 200);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
