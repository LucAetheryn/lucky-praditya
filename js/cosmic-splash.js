/**
     * ============================================================================
     * LUCKY PRADITYA CONNECTION — CINEMATIC COSMIC UNIVERSE ENGINE
     * ============================================================================
     * Architecture:
     * 1. High-DPI Responsive HTML5 Canvas Renderer (60 FPS target)
     * 2. Multi-Layer Parallax Starfield with Realistic Stellar Color Temperatures
     * 3. Volumetric Procedural Cosmic Nebulae & Distant Tilted Spiral Galaxy
     * 4. Precision 8-Scene Cinematic Director (~8.5s sequence, skippable & replayable)
     * 5. Guiding Star with Anamorphic Lens Flare, Corona & Shockwave Pulse
     * 6. Sleek Futuristic Orbital Rocket with Dynamic Banking & Ion-Plasma Trail
     * 7. Optional Procedural Web Audio API Cosmic Ambient Synthesizer
     * ============================================================================
     */

    (function () {
      'use strict';

      // -------------------------------------------------------------------------
      // DOM REFERENCES
      // -------------------------------------------------------------------------
      const canvas = document.getElementById('cosmos-canvas');
      const ctx = canvas.getContext('2d', { alpha: false });

      const splashOverlay = document.getElementById('splash-overlay');
      const splashBrandContainer = document.getElementById('splash-brand-container');
      const splashTagline = document.getElementById('splash-tagline');
      const splashProgressWrapper = document.getElementById('splash-progress-wrapper');
      const splashProgressBar = document.getElementById('splash-progress-bar');
      const sceneCaption = document.getElementById('scene-caption');
      const sceneTimer = document.getElementById('scene-timer');

      const telemetryLabel = document.getElementById('telemetry-label');
      const skipIntroBtn = document.getElementById('skip-intro-btn');
      const replayIntroBtn = document.getElementById('replay-intro-btn');
      const mainInterface = document.getElementById('main-interface');

      const audioToggleBtn = document.getElementById('audio-toggle-btn');
      const iconSoundOff = document.getElementById('icon-sound-off');
      const iconSoundOn = document.getElementById('icon-sound-on');
      const audioLabel = document.getElementById('audio-label');

      const ctrlSpeed = document.getElementById('ctrl-speed');
      const ctrlNebula = document.getElementById('ctrl-nebula');
      const ctrlTrail = document.getElementById('ctrl-trail');
      const valSpeed = document.getElementById('val-speed');
      const valNebula = document.getElementById('val-nebula');
      const valTrail = document.getElementById('val-trail');

      // -------------------------------------------------------------------------
      // VIEWPORT & DPR MANAGEMENT
      // -------------------------------------------------------------------------
      let width = window.innerWidth;
      let height = window.innerHeight;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Offscreen Nebula & Galaxy Cache Canvas for silky 60 FPS blending
      const nebulaCanvas = document.createElement('canvas');
      const nebulaCtx = nebulaCanvas.getContext('2d');

      function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        buildProceduralNebulaLayer();
      }

      // -------------------------------------------------------------------------
      // CINEMATIC TIMELINE & STATE
      // -------------------------------------------------------------------------
      const INTRO_DURATION = 8.5; // Total splash duration in seconds
      const state = {
        mode: 'intro', // 'intro' | 'home'
        elapsed: 0,
        lastFrameTime: performance.now(),
        globalTime: 0,

        // User-adjustable ambient universe multipliers
        speedMultiplier: 1.0,
        nebulaMultiplier: 1.0,
        trailMultiplier: 1.0,

        // Interactive Pointer / Gyro Parallax (-1 to 1)
        pointerX: 0,
        pointerY: 0,
        smoothPointerX: 0,
        smoothPointerY: 0,

        // Virtual Camera State
        camera: {
          x: 0,
          y: 0,
          zoom: 1.0
        },

        // Guiding Star State
        star: {
          x: 0,
          y: 0,
          alpha: 0,
          scale: 0,
          pulseWave: 0 // 0 to 1 expanding cosmic ring
        },

        // Futuristic Rocket State
        rocket: {
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          angle: -0.6,
          alpha: 0,
          thrust: 0,
          trail: []
        },

        // Ambient Dust & Spark Particles
        particles: [],
        stars: []
      };

      // -------------------------------------------------------------------------
      // PROCEDURAL STARFIELD INITIALIZATION
      // -------------------------------------------------------------------------
      const STAR_SPECTRA = [
        { color: '#dbeafe', weight: 0.25 }, // Blue-white O/B
        { color: '#ffffff', weight: 0.40 }, // Pure white A
        { color: '#fff8e7', weight: 0.22 }, // Warm starlight F/G
        { color: '#bae6fd', weight: 0.08 }, // Ethereal cyan
        { color: '#fde68a', weight: 0.05 }  // Subtle gold K
      ];

      function pickStarColor() {
        const r = Math.random();
        let acc = 0;
        for (const s of STAR_SPECTRA) {
          acc += s.weight;
          if (r <= acc) return s.color;
        }
        return '#ffffff';
      }

      function initStars() {
        const area = width * height;
        const count = Math.min(Math.max(Math.floor(area / 2800), 220), 650);
        state.stars = [];

        for (let i = 0; i < count; i++) {
          // 3 parallax depth layers: 0 (far), 1 (mid), 2 (near)
          const layerRoll = Math.random();
          const layer = layerRoll < 0.62 ? 0 : layerRoll < 0.88 ? 1 : 2;
          const depth = layer === 0 ? 0.22 : layer === 1 ? 0.55 : 1.0;

          state.stars.push({
            nx: Math.random(), // normalized 0..1
            ny: Math.random(),
            radius: layer === 0 ? (0.45 + Math.random() * 0.55) : layer === 1 ? (0.8 + Math.random() * 0.7) : (1.2 + Math.random() * 0.9),
            baseAlpha: layer === 0 ? (0.28 + Math.random() * 0.45) : layer === 1 ? (0.45 + Math.random() * 0.45) : (0.65 + Math.random() * 0.35),
            twinkleSpeed: 0.8 + Math.random() * 2.4,
            twinklePhase: Math.random() * Math.PI * 2,
            color: pickStarColor(),
            depth,
            hasSpike: layer === 2 && Math.random() > 0.78
          });
        }
      }

      // -------------------------------------------------------------------------
      // PROCEDURAL VOLUMETRIC NEBULAE & DISTANT SPIRAL GALAXY
      // -------------------------------------------------------------------------
      function buildProceduralNebulaLayer() {
        const nw = Math.max(Math.floor(width * 0.75), 600);
        const nh = Math.max(Math.floor(height * 0.75), 600);
        nebulaCanvas.width = nw;
        nebulaCanvas.height = nh;

        nebulaCtx.clearRect(0, 0, nw, nh);
        nebulaCtx.globalCompositeOperation = 'screen';

        // Cloud clusters creating rich cosmic depth (Midnight Blue, Purple, Violet, Cyan)
        const clouds = [
          { x: nw * 0.25, y: nh * 0.32, r: nw * 0.46, c1: 'rgba(28, 17, 56, 0.55)', c2: 'rgba(9, 17, 36, 0.0)' },
          { x: nw * 0.72, y: nh * 0.28, r: nw * 0.48, c1: 'rgba(76, 40, 137, 0.38)', c2: 'rgba(28, 17, 56, 0.0)' },
          { x: nw * 0.65, y: nh * 0.68, r: nw * 0.45, c1: 'rgba(14, 116, 144, 0.24)', c2: 'rgba(9, 17, 36, 0.0)' },
          { x: nw * 0.36, y: nh * 0.72, r: nw * 0.42, c1: 'rgba(56, 189, 248, 0.14)', c2: 'rgba(3, 5, 10, 0.0)' },
          { x: nw * 0.52, y: nh * 0.46, r: nw * 0.36, c1: 'rgba(109, 40, 217, 0.22)', c2: 'rgba(9, 17, 36, 0.0)' }
        ];

        for (const cl of clouds) {
          const g = nebulaCtx.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.r);
          g.addColorStop(0, cl.c1);
          g.addColorStop(0.55, cl.c1.replace(/[\d.]+\)$/, '0.09)'));
          g.addColorStop(1, cl.c2);
          nebulaCtx.fillStyle = g;
          nebulaCtx.beginPath();
          nebulaCtx.arc(cl.x, cl.y, cl.r, 0, Math.PI * 2);
          nebulaCtx.fill();
        }

        // Delicate Wispy Cosmic Filaments
        for (let i = 0; i < 28; i++) {
          const fx = nw * (0.15 + Math.random() * 0.7);
          const fy = nh * (0.15 + Math.random() * 0.7);
          const fr = nw * (0.08 + Math.random() * 0.16);
          const isCyan = i % 3 === 0;
          const g = nebulaCtx.createRadialGradient(fx, fy, 0, fx, fy, fr);
          g.addColorStop(0, isCyan ? 'rgba(125, 211, 252, 0.08)' : 'rgba(139, 92, 246, 0.09)');
          g.addColorStop(1, 'rgba(3, 5, 10, 0)');
          nebulaCtx.fillStyle = g;
          nebulaCtx.beginPath();
          nebulaCtx.arc(fx, fy, fr, 0, Math.PI * 2);
          nebulaCtx.fill();
        }

        // Distant Tilted Spiral Galaxy (Upper-Left / Mid-Background)
        nebulaCtx.save();
        const gx = nw * 0.28;
        const gy = nh * 0.30;
        nebulaCtx.translate(gx, gy);
        nebulaCtx.rotate(-0.42);
        nebulaCtx.scale(1, 0.38);

        const galaxyRadius = Math.min(nw, nh) * 0.16;
        const coreGrad = nebulaCtx.createRadialGradient(0, 0, 0, 0, 0, galaxyRadius);
        coreGrad.addColorStop(0, 'rgba(255, 248, 231, 0.42)');
        coreGrad.addColorStop(0.22, 'rgba(196, 181, 253, 0.22)');
        coreGrad.addColorStop(0.58, 'rgba(56, 189, 248, 0.09)');
        coreGrad.addColorStop(1, 'rgba(3, 5, 10, 0)');
        nebulaCtx.fillStyle = coreGrad;
        nebulaCtx.beginPath();
        nebulaCtx.arc(0, 0, galaxyRadius, 0, Math.PI * 2);
        nebulaCtx.fill();

        // Spiral Dust Arms
        nebulaCtx.strokeStyle = 'rgba(224, 242, 254, 0.14)';
        nebulaCtx.lineWidth = 2.2;
        for (let arm = 0; arm < 2; arm++) {
          nebulaCtx.beginPath();
          const armOffset = arm * Math.PI;
          for (let a = 0.2; a < 4.4; a += 0.12) {
            const rad = (a / 4.4) * galaxyRadius * 0.92;
            const px = Math.cos(a + armOffset) * rad;
            const py = Math.sin(a + armOffset) * rad;
            if (a === 0.2) nebulaCtx.moveTo(px, py);
            else nebulaCtx.lineTo(px, py);
          }
          nebulaCtx.stroke();
        }
        nebulaCtx.restore();
      }

      // -------------------------------------------------------------------------
      // EASING & INTERPOLATION HELPERS
      // -------------------------------------------------------------------------
      function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
      }

      function lerp(a, b, t) {
        return a + (b - a) * t;
      }

      function smoothstep(edge0, edge1, x) {
        const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
      }

      function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
      }

      function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      // -------------------------------------------------------------------------
      // PARTICLE EMITTER FOR ION TRAIL & COSMIC SPARKS
      // -------------------------------------------------------------------------
      function spawnIonParticle(x, y, vx, vy, boost = 1) {
        if (state.particles.length > 260) return;
        const spread = (Math.random() - 0.5) * 28;
        const speedFactor = 0.25 + Math.random() * 0.45;
        const palette = ['#7dd3fc', '#a78bfa', '#c4b5fd', '#fff8e7', '#38bdf8'];
        state.particles.push({
          x: x + (Math.random() - 0.5) * 3,
          y: y + (Math.random() - 0.5) * 3,
          vx: -vx * speedFactor + spread,
          vy: -vy * speedFactor + spread,
          life: 0,
          maxLife: (0.45 + Math.random() * 0.65) * boost,
          size: (1.1 + Math.random() * 2.1) * boost,
          color: palette[Math.floor(Math.random() * palette.length)]
        });
      }

      function updateParticles(dt) {
        for (let i = state.particles.length - 1; i >= 0; i--) {
          const p = state.particles[i];
          p.life += dt;
          if (p.life >= p.maxLife) {
            state.particles.splice(i, 1);
            continue;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.96;
          p.vy *= 0.96;
        }
      }

      // -------------------------------------------------------------------------
      // SCENE CHOREOGRAPHY DIRECTOR (8 SCENES)
      // -------------------------------------------------------------------------
      function getSceneMeta(t) {
        if (t < 1.2) return { code: 'SCENE 01 · DEEP VOID', caption: 'Awakening the Cosmos' };
        if (t < 2.5) return { code: 'SCENE 02 · NEBULA BLOOM', caption: 'Unveiling Galactic Depth' };
        if (t < 3.5) return { code: 'SCENE 03 · GUIDING STAR', caption: 'A Distant Light Ignites' };
        if (t < 4.8) return { code: 'SCENE 04 · PURSUIT', caption: 'Chasing Limitless Horizons' };
        if (t < 6.2) return { code: 'SCENE 05 · TRAJECTORY', caption: 'Navigating the Nebula' };
        if (t < 7.2) return { code: 'SCENE 06 · CRESCENDO', caption: 'Illuminating the Universe' };
        if (t < 8.5) return { code: 'SCENE 07 · IDENTITY', caption: 'Lucky Praditya Connection' };
        return { code: 'PORTAL ACTIVE · LIVE COSMOS', caption: 'Beyond the Stars, Beyond the Limits.' };
      }

      function updateChoreography(dt) {
        state.globalTime += dt * state.speedMultiplier;

        // Smooth pointer parallax interpolation
        state.smoothPointerX = lerp(state.smoothPointerX, state.pointerX, clamp(dt * 4, 0, 1));
        state.smoothPointerY = lerp(state.smoothPointerY, state.pointerY, clamp(dt * 4, 0, 1));

        const isMobile = width < 640;

        if (state.mode === 'intro') {
          state.elapsed += dt;
          const t = state.elapsed;

          // Update UI Telemetry & Progress
          const progressPct = clamp((t / INTRO_DURATION) * 100, 0, 100);
          splashProgressBar.style.width = `${progressPct}%`;
          sceneTimer.textContent = `${Math.min(t, INTRO_DURATION).toFixed(1).padStart(4, '0')}s / 08.5s`;

          const meta = getSceneMeta(t);
          if (telemetryLabel.textContent !== meta.code) {
            telemetryLabel.textContent = meta.code;
            sceneCaption.textContent = meta.caption;
          }

          // Scene 1–3: Guiding Star Ignition & Graceful Path
          const starAppear = smoothstep(2.45, 3.4, t);
          const starCrescendo = smoothstep(6.1, 7.1, t);
          state.star.alpha = starAppear;
          state.star.scale = easeOutCubic(starAppear) * (1 + starCrescendo * 0.45);

          // Trigger star shockwave at Scene 6
          if (t >= 6.2 && t <= 6.3 && state.star.pulseWave === 0) {
            state.star.pulseWave = 0.01;
          }

          // Guiding Star Trajectory across the cosmos (always ahead of rocket)
          const starProgress = smoothstep(2.5, 8.5, t);
          const startStarX = isMobile ? width * 0.72 : width * 0.68;
          const startStarY = isMobile ? height * 0.28 : height * 0.26;
          const endStarX = isMobile ? width * 0.78 : width * 0.76;
          const endStarY = isMobile ? height * 0.22 : height * 0.21;

          state.star.x = lerp(startStarX, endStarX, starProgress) + Math.sin(t * 1.4) * (isMobile ? 14 : 26);
          state.star.y = lerp(startStarY, endStarY, starProgress) + Math.cos(t * 1.1) * (isMobile ? 10 : 18);

          // Scene 4–6: Rocket Ignition & Curved Pursuit of the Guiding Star
          const rocketEnter = smoothstep(3.45, 4.3, t);
          const pursuitProgress = easeInOutCubic(clamp((t - 3.45) / 4.8, 0, 1));
          state.rocket.alpha = rocketEnter;
          state.rocket.thrust = smoothstep(3.45, 4.1, t) * (1 + starCrescendo * 0.35);

          // Quadratic Bezier Trajectory from Lower-Left sweeping toward Upper-Right Star
          const p0 = { x: -width * 0.08, y: height * 0.86 };
          const p1 = { x: width * 0.32, y: height * 0.68 };
          const p2 = {
            x: state.star.x - (isMobile ? 72 : 135),
            y: state.star.y + (isMobile ? 54 : 82)
          };

          const u = pursuitProgress;
          const invU = 1 - u;
          const nextX = invU * invU * p0.x + 2 * invU * u * p1.x + u * u * p2.x;
          const nextY = invU * invU * p0.y + 2 * invU * u * p1.y + u * u * p2.y;

          // Tangent derivative for realistic rocket orientation
          const dx = 2 * invU * (p1.x - p0.x) + 2 * u * (p2.x - p1.x);
          const dy = 2 * invU * (p1.y - p0.y) + 2 * u * (p2.y - p1.y);

          state.rocket.vx = dx * 0.35;
          state.rocket.vy = dy * 0.35;
          state.rocket.x = nextX;
          state.rocket.y = nextY;
          state.rocket.angle = Math.atan2(dy, dx);

          // Record Luminous Ribbon Trail & Spawn Ion Particles
          if (rocketEnter > 0.05) {
            const tailOffset = 18;
            const tx = state.rocket.x - Math.cos(state.rocket.angle) * tailOffset;
            const ty = state.rocket.y - Math.sin(state.rocket.angle) * tailOffset;

            state.rocket.trail.push({ x: tx, y: ty, age: 0 });
            if (Math.random() < 0.85 * state.trailMultiplier) {
              spawnIonParticle(tx, ty, Math.cos(state.rocket.angle) * 140, Math.sin(state.rocket.angle) * 140, 1.0);
            }
          }

          // Scene 5: Virtual Camera Tracking & Subtle Push-In
          const camTrack = smoothstep(4.6, 6.4, t) * (1 - smoothstep(6.8, 8.3, t));
          state.camera.x = lerp(0, (state.rocket.x - width * 0.5) * -0.14, camTrack);
          state.camera.y = lerp(0, (state.rocket.y - height * 0.5) * -0.14, camTrack);
          state.camera.zoom = 1 + smoothstep(0, 8.5, t) * 0.08 + camTrack * 0.04;

          // Scene 7: Brand Title & Tagline Reveal
          if (t >= 7.15) {
            splashBrandContainer.classList.remove('opacity-0', 'translate-y-4');
            splashBrandContainer.classList.add('opacity-100', 'translate-y-0');
          }
          if (t >= 7.55) {
            splashTagline.classList.remove('opacity-0', 'translate-y-2');
            splashTagline.classList.add('opacity-100', 'translate-y-0');
          }

          // Scene 8: Transition into Main Home Interface
          if (t >= INTRO_DURATION) {
            completeIntroSequence();
          }
        } else {
          // -------------------------------------------------------------------
          // LIVING AMBIENT HOME COSMOS MODE (Rocket continuously orbits/chases star)
          // -------------------------------------------------------------------
          const gt = state.globalTime;
          state.star.alpha = 1;
          state.star.scale = 1 + Math.sin(gt * 2.2) * 0.08;

          // Star glides along a gentle figure-eight / harmonic arc in the upper cosmos
          const cx = width * 0.5 + Math.cos(gt * 0.24) * (width * (isMobile ? 0.28 : 0.34));
          const cy = height * (isMobile ? 0.22 : 0.24) + Math.sin(gt * 0.48) * (height * 0.09);

          state.star.x = lerp(state.star.x, cx, clamp(dt * 2.5, 0, 1));
          state.star.y = lerp(state.star.y, cy, clamp(dt * 2.5, 0, 1));

          // Rocket smoothly steers toward a trailing formation behind the star
          const targetX = state.star.x - Math.cos(gt * 0.24 + 0.35) * (isMobile ? 78 : 130);
          const targetY = state.star.y - Math.sin(gt * 0.48 + 0.35) * (isMobile ? 48 : 75) + 28;

          const prevX = state.rocket.x;
          const prevY = state.rocket.y;

          state.rocket.x = lerp(state.rocket.x, targetX, clamp(dt * 1.8 * state.speedMultiplier, 0, 1));
          state.rocket.y = lerp(state.rocket.y, targetY, clamp(dt * 1.8 * state.speedMultiplier, 0, 1));
          state.rocket.alpha = 1;
          state.rocket.thrust = 0.85;

          const moveDx = state.rocket.x - prevX;
          const moveDy = state.rocket.y - prevY;
          if (Math.hypot(moveDx, moveDy) > 0.05) {
            const desiredAngle = Math.atan2(moveDy, moveDx);
            // Shortest angular interpolation
            let diff = desiredAngle - state.rocket.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            state.rocket.angle += diff * clamp(dt * 6, 0, 1);
          }

          const tailOffset = 18;
          const tx = state.rocket.x - Math.cos(state.rocket.angle) * tailOffset;
          const ty = state.rocket.y - Math.sin(state.rocket.angle) * tailOffset;
          state.rocket.trail.push({ x: tx, y: ty, age: 0 });

          if (Math.random() < 0.65 * state.trailMultiplier) {
            spawnIonParticle(tx, ty, Math.cos(state.rocket.angle) * 90, Math.sin(state.rocket.angle) * 90, 0.85);
          }

          // Camera responds gently to pointer/gyro parallax
          state.camera.x = lerp(state.camera.x, -state.smoothPointerX * 22, clamp(dt * 3, 0, 1));
          state.camera.y = lerp(state.camera.y, -state.smoothPointerY * 16, clamp(dt * 3, 0, 1));
          state.camera.zoom = lerp(state.camera.zoom, 1.04, clamp(dt * 2, 0, 1));
        }

        // Age & prune ribbon trail points
        for (let i = state.rocket.trail.length - 1; i >= 0; i--) {
          state.rocket.trail[i].age += dt * (1.25 / Math.max(state.trailMultiplier, 0.4));
          if (state.rocket.trail[i].age >= 1.0) {
            state.rocket.trail.splice(i, 1);
          }
        }

        // Update star shockwave ring
        if (state.star.pulseWave > 0) {
          state.star.pulseWave += dt * 0.85;
          if (state.star.pulseWave >= 1) {
            state.star.pulseWave = 0;
          }
        }

        updateParticles(dt);
      }

      // -------------------------------------------------------------------------
      // RENDERING PIPELINE (60 FPS CANVAS)
      // -------------------------------------------------------------------------
      function render() {
        const t = state.mode === 'intro' ? state.elapsed : INTRO_DURATION;

        // 1. Deep Space Void Backdrop
        ctx.fillStyle = '#03050a';
        ctx.fillRect(0, 0, width, height);

        // Scene Fade-In Visibility Factors
        const starsVisibility = state.mode === 'intro' ? smoothstep(0.0, 1.4, t) : 1;
        const nebulaVisibility = (state.mode === 'intro' ? smoothstep(1.1, 2.6, t) : 1) * state.nebulaMultiplier;

        ctx.save();

        // Apply Virtual Camera Transform
        ctx.translate(width * 0.5 + state.camera.x, height * 0.5 + state.camera.y);
        ctx.scale(state.camera.zoom, state.camera.zoom);
        ctx.translate(-width * 0.5, -height * 0.5);

        // 2. Render Volumetric Cosmic Nebula & Distant Galaxy
        if (nebulaVisibility > 0.005) {
          ctx.save();
          ctx.globalAlpha = clamp(nebulaVisibility * 0.92, 0, 1);
          ctx.globalCompositeOperation = 'screen';

          const driftX = Math.sin(state.globalTime * 0.06) * 24 - state.smoothPointerX * 14;
          const driftY = Math.cos(state.globalTime * 0.05) * 18 - state.smoothPointerY * 10;
          const pad = 60;

          ctx.drawImage(
            nebulaCanvas,
            -pad + driftX,
            -pad + driftY,
            width + pad * 2,
            height + pad * 2
          );
          ctx.restore();
        }

        // 3. Render Multi-Layer Parallax Starfield
        if (starsVisibility > 0.005) {
          ctx.save();
          for (let i = 0; i < state.stars.length; i++) {
            const s = state.stars[i];

            // Slow cosmic drift + pointer parallax
            const driftOffsetX = (state.globalTime * 2.2 * s.depth) % width;
            let sx = ((s.nx * width - driftOffsetX) % width + width) % width;
            let sy = s.ny * height;

            sx -= state.smoothPointerX * 28 * s.depth;
            sy -= state.smoothPointerY * 20 * s.depth;

            const twinkle = 0.72 + 0.28 * Math.sin(state.globalTime * s.twinkleSpeed + s.twinklePhase);
            const alpha = s.baseAlpha * twinkle * starsVisibility;

            ctx.globalAlpha = clamp(alpha, 0, 1);
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
            ctx.fill();

            // Subtle cross-glint on prominent foreground stars
            if (s.hasSpike && alpha > 0.55) {
              ctx.strokeStyle = s.color;
              ctx.lineWidth = 0.6;
              const spikeLen = s.radius * 3.8;
              ctx.beginPath();
              ctx.moveTo(sx - spikeLen, sy);
              ctx.lineTo(sx + spikeLen, sy);
              ctx.moveTo(sx, sy - spikeLen);
              ctx.lineTo(sx, sy + spikeLen);
              ctx.stroke();
            }
          }
          ctx.restore();
        }

        // 4. Render Rocket Luminous Ribbon Trail & Ion Particles
        renderRocketTrail();
        renderIonParticles();

        // 5. Render Guiding Star (Corona, Anamorphic Flare, Shockwave & Core)
        if (state.star.alpha > 0.005) {
          renderGuidingStar(state.star.x, state.star.y, state.star.alpha, state.star.scale);
        }

        // 6. Render Sleek Futuristic Orbital Rocket
        if (state.rocket.alpha > 0.005) {
          renderFuturisticRocket(state.rocket.x, state.rocket.y, state.rocket.angle, state.rocket.alpha, state.rocket.thrust);
        }

        ctx.restore();
      }

      function renderRocketTrail() {
        const pts = state.rocket.trail;
        if (pts.length < 2) return;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i - 1];
          const p1 = pts[i];
          const lifeRatio = 1 - p1.age; // 1 near rocket, 0 at tail end

          // Outer Violet-Blue Ion Aura
          ctx.strokeStyle = `rgba(124, 58, 237, ${lifeRatio * 0.34 * state.rocket.alpha})`;
          ctx.lineWidth = Math.max(0.8, lifeRatio * 9.5);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();

          // Inner Ethereal Cyan Core Stream
          ctx.strokeStyle = `rgba(125, 211, 252, ${lifeRatio * 0.72 * state.rocket.alpha})`;
          ctx.lineWidth = Math.max(0.5, lifeRatio * 3.2);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      function renderIonParticles() {
        if (state.particles.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < state.particles.length; i++) {
          const p = state.particles[i];
          const ratio = 1 - p.life / p.maxLife;
          ctx.globalAlpha = ratio * 0.85 * state.rocket.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * ratio, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      function renderGuidingStar(x, y, alpha, scale) {
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.globalCompositeOperation = 'screen';

        const shimmer = 1 + Math.sin(state.globalTime * 4.5) * 0.06;
        const rOuter = 95 * scale * shimmer;

        // Expanding Celestial Shockwave Ring (Scene 6 & Interactive Pulse)
        if (state.star.pulseWave > 0) {
          const w = state.star.pulseWave;
          const waveRadius = 20 + easeOutCubic(w) * Math.min(width, height) * 0.42;
          ctx.strokeStyle = `rgba(186, 230, 253, ${(1 - w) * 0.42})`;
          ctx.lineWidth = 2 * (1 - w);
          ctx.beginPath();
          ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Wide Atmospheric Halo (Violet -> Cyan -> Warm Starlight)
        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, rOuter);
        halo.addColorStop(0, 'rgba(255, 252, 240, 0.95)');
        halo.addColorStop(0.14, 'rgba(254, 243, 199, 0.62)');
        halo.addColorStop(0.35, 'rgba(125, 211, 252, 0.24)');
        halo.addColorStop(0.68, 'rgba(139, 92, 246, 0.08)');
        halo.addColorStop(1, 'rgba(3, 5, 10, 0)');

        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
        ctx.fill();

        // Anamorphic Horizontal Cinema Lens Flare
        const flareWidth = 170 * scale * shimmer;
        const flareGrad = ctx.createLinearGradient(-flareWidth, 0, flareWidth, 0);
        flareGrad.addColorStop(0, 'rgba(125, 211, 252, 0)');
        flareGrad.addColorStop(0.35, 'rgba(125, 211, 252, 0.22)');
        flareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
        flareGrad.addColorStop(0.65, 'rgba(125, 211, 252, 0.22)');
        flareGrad.addColorStop(1, 'rgba(125, 211, 252, 0)');

        ctx.fillStyle = flareGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, flareWidth, 1.8 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4-Point Precision Diffraction Spikes
        const spikeLong = 42 * scale * shimmer;
        const spikeShort = 24 * scale * shimmer;
        ctx.fillStyle = 'rgba(255, 250, 235, 0.85)';

        // Primary vertical/horizontal diamond
        ctx.beginPath();
        ctx.moveTo(0, -spikeLong);
        ctx.quadraticCurveTo(0, 0, spikeLong, 0);
        ctx.quadraticCurveTo(0, 0, 0, spikeLong);
        ctx.quadraticCurveTo(0, 0, -spikeLong, 0);
        ctx.quadraticCurveTo(0, 0, 0, -spikeLong);
        ctx.fill();

        // Secondary 45-degree subtle diamond
        ctx.save();
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
        ctx.beginPath();
        ctx.moveTo(0, -spikeShort);
        ctx.quadraticCurveTo(0, 0, spikeShort, 0);
        ctx.quadraticCurveTo(0, 0, 0, spikeShort);
        ctx.quadraticCurveTo(0, 0, -spikeShort, 0);
        ctx.quadraticCurveTo(0, 0, 0, -spikeShort);
        ctx.fill();
        ctx.restore();

        // Brilliant Star Nucleus
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3.6 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      function renderFuturisticRocket(x, y, angle, alpha, thrust) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.globalAlpha = clamp(alpha, 0, 1);

        const scale = width < 640 ? 0.85 : 1.0;
        ctx.scale(scale, scale);

        // 1. Focused Ion-Plasma Thruster Plume
        if (thrust > 0.05) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const flicker = 0.88 + Math.random() * 0.24;
          const plumeLen = (26 + thrust * 18) * flicker;

          const plumeGrad = ctx.createLinearGradient(-14, 0, -14 - plumeLen, 0);
          plumeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          plumeGrad.addColorStop(0.25, 'rgba(125, 211, 252, 0.85)');
          plumeGrad.addColorStop(0.65, 'rgba(139, 92, 246, 0.35)');
          plumeGrad.addColorStop(1, 'rgba(76, 40, 137, 0)');

          ctx.fillStyle = plumeGrad;
          ctx.beginPath();
          ctx.moveTo(-13, -3.2);
          ctx.quadraticCurveTo(-14 - plumeLen * 0.5, 0, -14 - plumeLen, 0);
          ctx.quadraticCurveTo(-14 - plumeLen * 0.5, 0, -13, 3.2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // 2. Swept-Back Aerospace Delta Fins (Dark Titanium)
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 0.7;

        // Upper Fin
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(-16, -11);
        ctx.lineTo(-13, -3.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Lower Fin
        ctx.beginPath();
        ctx.moveTo(-6, 4);
        ctx.lineTo(-16, 11);
        ctx.lineTo(-13, 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. Sleek Tapered Orbital Fuselage (Metallic Silver-Pearl Gradient)
        const hullGrad = ctx.createLinearGradient(0, -6.5, 0, 6.5);
        hullGrad.addColorStop(0, '#f8fafc');
        hullGrad.addColorStop(0.45, '#cbd5e1');
        hullGrad.addColorStop(0.85, '#475569');
        hullGrad.addColorStop(1, '#1e293b');

        ctx.fillStyle = hullGrad;
        ctx.beginPath();
        ctx.moveTo(22, 0); // Needle nosecone
        ctx.bezierCurveTo(14, -5.2, 2, -6.2, -13, -4.2);
        ctx.lineTo(-14, 0);
        ctx.lineTo(-13, 4.2);
        ctx.bezierCurveTo(2, 6.2, 14, 5.2, 22, 0);
        ctx.closePath();
        ctx.fill();

        // Specular Rim Highlight along Top Edge
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(20, -0.4);
        ctx.bezierCurveTo(12, -4.6, 2, -5.4, -12, -3.8);
        ctx.stroke();

        // 4. Illuminated Cyan Cockpit / Sensor Slit
        const visorGrad = ctx.createLinearGradient(4, 0, 12, 0);
        visorGrad.addColorStop(0, '#0284c7');
        visorGrad.addColorStop(0.5, '#7dd3fc');
        visorGrad.addColorStop(1, '#e0f2fe');

        ctx.fillStyle = visorGrad;
        ctx.beginPath();
        ctx.ellipse(7.5, -0.8, 4.2, 1.35, -0.08, 0, Math.PI * 2);
        ctx.fill();

        // 5. Engine Nozzle Ring
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-14.8, -3.2, 2.2, 6.4);

        ctx.restore();
      }

      // -------------------------------------------------------------------------
      // MAIN 60 FPS ANIMATION LOOP
      // -------------------------------------------------------------------------
      function animationLoop(now) {
        const rawDt = (now - state.lastFrameTime) / 1000;
        state.lastFrameTime = now;
        // Clamp delta-time to prevent large jumps if tab was backgrounded
        const dt = Math.min(rawDt, 0.05);

        updateChoreography(dt);
        render();

        requestAnimationFrame(animationLoop);
      }

      // -------------------------------------------------------------------------
      // SPLASH <-> HOME TRANSITION HANDLERS
      // -------------------------------------------------------------------------
      function completeIntroSequence() {
        if (state.mode === 'home') return;
        state.mode = 'home';

        // Update Telemetry Badge
        telemetryLabel.textContent = 'PORTAL ACTIVE · LIVE COSMOS';

        // Smoothly Fade Out Splash Overlay
        splashOverlay.classList.add('opacity-0');
        splashProgressWrapper.classList.add('opacity-0');

        // Swap Header Action Buttons
        skipIntroBtn.classList.add('hidden');
        replayIntroBtn.classList.remove('hidden');
        replayIntroBtn.classList.add('inline-flex');

        // Reveal Main Application Home Interface
        setTimeout(() => {
          splashOverlay.style.display = 'none';
          mainInterface.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-6');
          mainInterface.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
        }, 350);
      }

      function replayIntroSequence() {
        state.mode = 'intro';
        state.elapsed = 0;
        state.rocket.trail = [];
        state.particles = [];
        state.star.pulseWave = 0;

        // Reset Splash Brand Elements
        splashBrandContainer.classList.add('opacity-0', 'translate-y-4');
        splashBrandContainer.classList.remove('opacity-100', 'translate-y-0');
        splashTagline.classList.add('opacity-0', 'translate-y-2');
        splashTagline.classList.remove('opacity-100', 'translate-y-0');

        // Hide Home Interface
        mainInterface.classList.add('opacity-0', 'pointer-events-none', 'translate-y-6');
        mainInterface.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');

        // Restore Splash Overlay
        splashOverlay.style.display = 'flex';
        requestAnimationFrame(() => {
          splashOverlay.classList.remove('opacity-0');
          splashProgressWrapper.classList.remove('opacity-0');
        });

        // Swap Buttons
        replayIntroBtn.classList.add('hidden');
        replayIntroBtn.classList.remove('inline-flex');
        skipIntroBtn.classList.remove('hidden');

        if (audioEnabled) {
          playCosmicChime();
        }
      }

      skipIntroBtn.addEventListener('click', completeIntroSequence);
      replayIntroBtn.addEventListener('click', replayIntroSequence);

      // -------------------------------------------------------------------------
      // INTERACTIVE HOME PORTAL ACTIONS
      // -------------------------------------------------------------------------
      let toastTimeout = null;
      function showCosmicToast(message) {
        const toast = document.getElementById('cosmic-toast');
        toast.textContent = message;
        toast.classList.remove('opacity-0', 'translate-y-4');
        toast.classList.add('opacity-100', 'translate-y-0');

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
          toast.classList.add('opacity-0', 'translate-y-4');
          toast.classList.remove('opacity-100', 'translate-y-0');
        }, 3200);
      }

      window.startIntro = function () { replayIntroSequence(); };

      window.triggerStarPulse = function () {
        state.star.pulseWave = 0.01;
        for (let i = 0; i < 28; i++) {
          const ang = (Math.PI * 2 * i) / 28;
          spawnIonParticle(
            state.star.x,
            state.star.y,
            -Math.cos(ang) * 160,
            -Math.sin(ang) * 160,
            1.35
          );
        }
        if (audioEnabled) playCosmicChime();
        showCosmicToast('Guiding Star harmonic pulse transmitted.');
      };

      window.toggleUniversePanel = function () {
        const panel = document.getElementById('universe-controls-panel');
        panel.classList.toggle('hidden');
      };

      const CONSTELLATION_NOTES = [
        '01 · Celestial Ambition — Charting visionary trajectories across the unknown.',
        '02 · Infinite Connection — Bridging minds, systems, and purposeful design.',
        '03 · Beyond the Limits — Elevating craft past conventional horizons.'
      ];

      window.selectConstellation = function (idx) {
        triggerStarPulse();
        showCosmicToast(CONSTELLATION_NOTES[idx] || CONSTELLATION_NOTES[0]);
      };

      // Universe Slider Listeners
      ctrlSpeed.addEventListener('input', (e) => {
        state.speedMultiplier = parseFloat(e.target.value);
        valSpeed.textContent = `${state.speedMultiplier.toFixed(1)}x`;
      });

      ctrlNebula.addEventListener('input', (e) => {
        state.nebulaMultiplier = parseFloat(e.target.value);
        valNebula.textContent = `${Math.round(state.nebulaMultiplier * 100)}%`;
      });

      ctrlTrail.addEventListener('input', (e) => {
        state.trailMultiplier = parseFloat(e.target.value);
        valTrail.textContent = `${Math.round(state.trailMultiplier * 100)}%`;
      });

      // -------------------------------------------------------------------------
      // POINTER & DEVICE ORIENTATION PARALLAX
      // -------------------------------------------------------------------------
      window.addEventListener('pointermove', (e) => {
        state.pointerX = (e.clientX / width) * 2 - 1;
        state.pointerY = (e.clientY / height) * 2 - 1;
      }, { passive: true });

      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma !== null && e.beta !== null) {
          state.pointerX = clamp(e.gamma / 35, -1, 1);
          state.pointerY = clamp((e.beta - 45) / 35, -1, 1);
        }
      }, { passive: true });

      // -------------------------------------------------------------------------
      // OPTIONAL PROCEDURAL WEB AUDIO COSMIC SYNTHESIZER (No External Audio URLs)
      // -------------------------------------------------------------------------
      let audioCtx = null;
      let masterGain = null;
      let audioEnabled = false;

      function initCosmicAudio() {
        if (audioCtx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);

        // Warm Ethereal Cosmic Pad (Dmaj9 celestial voicing: D2, A2, E3, F#3, A3)
        const freqs = [73.42, 110.0, 164.81, 185.0, 220.0];
        freqs.forEach((f, idx) => {
          const osc = audioCtx.createOscillator();
          const oscGain = audioCtx.createGain();
          const filter = audioCtx.createBiquadFilter();

          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(f, audioCtx.currentTime);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(420, audioCtx.currentTime);

          oscGain.gain.setValueAtTime(0.035 / (idx * 0.4 + 1), audioCtx.currentTime);

          osc.connect(filter);
          filter.connect(oscGain);
          oscGain.connect(masterGain);
          osc.start();
        });
      }

      function playCosmicChime() {
        if (!audioCtx || !audioEnabled) return;
        const now = audioCtx.currentTime;
        const notes = [587.33, 880.0, 1174.66]; // D5, A5, D6
        notes.forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.0001, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.035, now + i * 0.08 + 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 1.8);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 1.9);
        });
      }

      audioToggleBtn.addEventListener('click', () => {
        initCosmicAudio();
        if (!audioCtx) return;

        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        audioEnabled = !audioEnabled;
        const now = audioCtx.currentTime;

        if (audioEnabled) {
          masterGain.gain.cancelScheduledValues(now);
          masterGain.gain.setTargetAtTime(0.55, now, 0.5);
          iconSoundOff.classList.add('hidden');
          iconSoundOn.classList.remove('hidden');
          audioLabel.textContent = 'Sound On';
          playCosmicChime();
        } else {
          masterGain.gain.cancelScheduledValues(now);
          masterGain.gain.setTargetAtTime(0.0001, now, 0.25);
          iconSoundOn.classList.add('hidden');
          iconSoundOff.classList.remove('hidden');
          audioLabel.textContent = 'Sound Off';
        }
      });

      // -------------------------------------------------------------------------
      // INITIALIZATION & RESIZE HOOKS
      // -------------------------------------------------------------------------
      let resizeTimer = null;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          resizeCanvas();
          initStars();
        }, 120);
      });

      window.addEventListener('load', () => {
        resizeCanvas();
        initStars();
        state.lastFrameTime = performance.now();
        requestAnimationFrame(animationLoop);
      }, { once: true });

      // Safety fallback: never leave the existing application hidden if rendering is interrupted.
      window.setTimeout(() => {
        if (state.mode === 'intro' && !document.hidden) completeIntroSequence();
      }, 15000);

      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.setTimeout(completeIntroSequence, 120);
      }
    })();