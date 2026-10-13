/* ========================================
   MELANIA & VADIM — WEDDING INVITATION
   Main JavaScript
   ======================================== */

(function () {
  'use strict';

  // ===== CONFIG =====
  const WEDDING_DATE = new Date('2027-06-17T12:00:00+03:00').getTime();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== DOM REFS (matched to the current index.html) =====
  const gate = document.getElementById('gate');
  const mainSite = document.getElementById('site');
  const envelope = document.getElementById('openInvite');
  const seal = envelope ? envelope.querySelector('.seal') : null;
  const wax = envelope ? envelope.querySelector('.seal-wax') : null;
  const flap = envelope ? envelope.querySelector('.env-flap') : null;
  const card = envelope ? envelope.querySelector('.env-card') : null;
  const musicToggle = document.getElementById('sound');
  const progressBar = document.querySelector('.progress span');
  const screens = Array.from(document.querySelectorAll('#site > section, #site > header'));
  const countdown = document.getElementById('countdown');
  const form = document.getElementById('rsvpForm');
  const attendanceInput = document.getElementById('attendance');
  const conditional = document.getElementById('conditional');
  const success = document.getElementById('success');
  const choiceButtons = Array.from(document.querySelectorAll('.choice'));

  let envelopeOpen = false;
  let isAnimating = false;
  let musicPlaying = false;
  let audioContext = null;
  let currentScreen = 0;
  let scrollLock = false;

  // ===== HELPERS =====
  function safeAddClass(element, className) {
    if (element) element.classList.add(className);
  }

  function createSealParticles() {
    if (!seal || prefersReducedMotion) return;
    const oldParticles = envelope.querySelector('.seal-particles');
    if (oldParticles) oldParticles.remove();

    const particles = document.createElement('span');
    particles.className = 'seal-particles';
    particles.setAttribute('aria-hidden', 'true');
    particles.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:visible;';
    seal.appendChild(particles);

    for (let i = 0; i < 8; i += 1) {
      const particle = document.createElement('i');
      const angle = (Math.PI * 2 * i) / 8;
      const distance = 24 + Math.random() * 34;
      particle.style.cssText = [
        'position:absolute', 'left:50%', 'top:50%', 'width:5px', 'height:5px',
        'border-radius:50%', 'background:#b92737', 'opacity:1',
        'transition:transform .55s cubic-bezier(.16,1,.3,1),opacity .55s ease'
      ].join(';');
      particles.appendChild(particle);
      requestAnimationFrame(() => {
        particle.style.transform = `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px) scale(.2)`;
        particle.style.opacity = '0';
      });
    }
    window.setTimeout(() => particles.remove(), 750);
  }

  // ===== 1. ENVELOPE OPENING SEQUENCE =====
  function openEnvelope() {
    if (envelopeOpen || isAnimating || !gate || !mainSite) return;
    isAnimating = true;
    envelopeOpen = true;

    // Audio starts only after an explicit user gesture.
    playPaperSound();
    createSealParticles();
    safeAddClass(gate, 'opening');
    safeAddClass(envelope, 'is-opening');

    if (seal) {
      seal.style.transition = prefersReducedMotion
        ? 'none'
        : 'transform .65s cubic-bezier(.16,1,.3,1), opacity .55s ease';
      seal.style.transform = 'translate(58px,-42px) rotate(-28deg) scale(.32)';
      seal.style.opacity = '0';
    }

    window.setTimeout(() => safeAddClass(flap, 'opening'), prefersReducedMotion ? 0 : 380);

    window.setTimeout(() => {
      if (card) {
        card.style.transition = prefersReducedMotion
          ? 'none'
          : 'transform .8s cubic-bezier(.16,1,.3,1), opacity .6s ease';
        card.style.transform = 'translateY(-90px) scale(1.08) rotate(-2deg)';
        card.style.zIndex = '8';
      }
    }, prefersReducedMotion ? 0 : 720);

    window.setTimeout(() => {
      gate.classList.add('is-hidden');
      mainSite.classList.add('is-visible');
      mainSite.setAttribute('aria-hidden', 'false');
      document.body.classList.add('invitation-open');
      isAnimating = false;
      revealVisibleElements();
      updateProgress();
    }, prefersReducedMotion ? 100 : 1450);
  }

  if (envelope) {
    envelope.addEventListener('click', openEnvelope);
    envelope.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openEnvelope();
      }
    });
  }

  // Gentle idle motion for the envelope.
  if (envelope && !prefersReducedMotion) {
    envelope.classList.add('idle-sway');
    envelope.addEventListener('pointerdown', () => envelope.classList.remove('idle-sway'), { once: true });
  }

  // ===== 2. SCREEN / SCROLL PROGRESS =====
  function updateProgress() {
    if (!progressBar) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  }

  function revealVisibleElements() {
    document.querySelectorAll('.reveal, .reveal:not(.visible)').forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) element.classList.add('visible');
    });
  }

  window.addEventListener('scroll', () => {
    if (!envelopeOpen) return;
    updateProgress();
    revealVisibleElements();
  }, { passive: true });

  // Use real page scrolling on mobile instead of intercepting every swipe.
  // Keyboard navigation remains available for accessibility.
  document.addEventListener('keydown', (event) => {
    if (!envelopeOpen || isAnimating || event.target.matches('input, textarea, select, button')) return;
    if (event.key === 'PageDown' || event.key === 'ArrowDown') {
      const next = screens.find((screen) => screen.getBoundingClientRect().top > 30);
      if (next) {
        event.preventDefault();
        next.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    } else if (event.key === 'PageUp' || event.key === 'ArrowUp') {
      const previous = screens.slice().reverse().find((screen) => screen.getBoundingClientRect().top < -30);
      if (previous) {
        event.preventDefault();
        previous.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }
  });

  // ===== 3. COUNTDOWN TIMER =====
  function updateCountdown() {
    if (!countdown) return;
    const remaining = Math.max(0, WEDDING_DATE - Date.now());
    const units = {
      days: Math.floor(remaining / 86400000),
      hours: Math.floor((remaining % 86400000) / 3600000),
      minutes: Math.floor((remaining % 3600000) / 60000),
      seconds: Math.floor((remaining % 60000) / 1000)
    };
    Object.entries(units).forEach(([unit, value]) => {
      const element = countdown.querySelector(`[data-unit="${unit}"]`);
      if (element) element.textContent = String(value);
    });
  }

  updateCountdown();
  window.setInterval(updateCountdown, 1000);

  // ===== 4. RSVP FORM =====
  function setAttendance(value) {
    if (!attendanceInput) return;
    attendanceInput.value = value;
    choiceButtons.forEach((button) => {
      const selected = button.dataset.value === value;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    if (conditional) {
      conditional.classList.toggle('open', value === 'yes');
      conditional.setAttribute('aria-hidden', String(value !== 'yes'));
    }

    const submit = form ? form.querySelector('[type="submit"]') : null;
    if (submit) submit.style.display = value === 'no' ? 'none' : '';

    let noMessage = document.getElementById('rsvp-no-message');
    if (value === 'no' && !noMessage && form) {
      noMessage = document.createElement('p');
      noMessage.id = 'rsvp-no-message';
      noMessage.className = 'form-note';
      noMessage.textContent = 'Спасибо, что сообщили нам. Если захотите, отправьте ответ — мы будем знать, что вас не ждать.';
      form.appendChild(noMessage);
    }
    if (noMessage) noMessage.hidden = value !== 'no';
  }

  choiceButtons.forEach((button) => {
    button.addEventListener('click', () => setAttendance(button.dataset.value || ''));
  });

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const nameInput = form.querySelector('[name="name"]');
      const name = nameInput ? nameInput.value.trim() : '';
      const attendance = attendanceInput ? attendanceInput.value : '';
      if (!name) {
        if (nameInput) nameInput.focus();
        window.alert('Пожалуйста, введите ваше имя.');
        return;
      }
      if (!attendance) {
        window.alert('Пожалуйста, выберите вариант ответа.');
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      data.submittedAt = new Date().toISOString();

      // Current version stores a local backup only. Connect a secure endpoint
      // (Google Apps Script / Telegram / email) before claiming responses were sent.
      try {
        const saved = JSON.parse(localStorage.getItem('melaniaVadimRsvp') || '[]');
        saved.push(data);
        localStorage.setItem('melaniaVadimRsvp', JSON.stringify(saved));
      } catch (error) {
        console.warn('RSVP could not be saved locally:', error);
      }

      form.style.display = 'none';
      if (success) {
        success.style.display = 'block';
        success.setAttribute('aria-live', 'polite');
      }
    });
  }

  // ===== 5. SOUND TOGGLE =====
  function playPaperSound() {
    if (!musicPlaying || prefersReducedMotion) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContext) audioContext = new AudioContextClass();
      if (audioContext.state === 'suspended') audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.18);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.24);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.25);
    } catch (error) {
      console.warn('Audio is unavailable in this browser:', error);
    }
  }

  if (musicToggle) {
    musicToggle.setAttribute('aria-pressed', 'false');
    musicToggle.addEventListener('click', () => {
      musicPlaying = !musicPlaying;
      musicToggle.classList.toggle('sound-on', musicPlaying);
      musicToggle.setAttribute('aria-pressed', String(musicPlaying));
      musicToggle.setAttribute('aria-label', musicPlaying ? 'Выключить звук' : 'Включить звук');
      musicToggle.textContent = musicPlaying ? '♫' : '♪';
      if (musicPlaying) playPaperSound();
    });
  }

  // ===== 6. REVEAL ANIMATIONS =====
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          entry.target.querySelectorAll('.reveal').forEach((element, index) => {
            window.setTimeout(() => element.classList.add('visible'), index * 110);
          });
        }
      });
    }, { threshold: 0.18 });
    screens.forEach((screen) => observer.observe(screen));
  } else {
    document.querySelectorAll('.reveal').forEach((element) => element.classList.add('visible'));
  }

  // ===== 7. SUBTLE PARALLAX =====
  if (!prefersReducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let ticking = false;
    document.addEventListener('pointermove', (event) => {
      if (!envelopeOpen || ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        document.querySelectorAll('.hero-branch').forEach((branch, index) => {
          const factor = index === 0 ? 5 : -5;
          branch.style.setProperty('--parallax-x', `${x * factor}px`);
          branch.style.setProperty('--parallax-y', `${y * factor}px`);
        });
        ticking = false;
      });
    }, { passive: true });
  }

  // ===== 8. INITIAL STATE =====
  updateProgress();
  if (conditional) {
    conditional.classList.remove('open');
    conditional.setAttribute('aria-hidden', 'true');
  }
  if (success) success.style.display = 'none';
  if (mainSite) mainSite.setAttribute('aria-hidden', 'true');

  // Avoid an unused-variable warning in environments with strict linters.
  void currentScreen;
  void scrollLock;
})();
