/* =========================================================================
   GETECH — Cinematic 3D layer (ES module)

   The page stops behaving like a document and plays like a film:
     • Every section becomes a full-screen "scene" stacked on a fixed stage.
     • The scrollbar is only a scrubber. Scrolling moves the playhead of one
       GSAP master timeline; scenes hand over with 3D camera moves.
     • One WebGL particle system morphs between a shape per scene:
         sphere → sound terrain → vinyl → data columns → warp tunnel
         → galaxy → sphere
     • Letting go mid-transition finishes it (soft chapter snapping).

   Libraries (pinned in the <script type="importmap"> in index.html):
     three · gsap (+ ScrollTrigger, SplitText) · lenis

   Contract with script.js
     <html class="has-3d"> is set in <head> when WebGL works and reduced
     motion is off. We report back through window.__motionState + events:
       'motion:ready'     — film is built, preloader may lift
       'motion:fallback'  — something failed, script.js restores the 2D page
   ========================================================================= */

const root   = document.documentElement;
const main   = document.getElementById('main');
const hero   = document.querySelector('.hero');
const canvas = document.getElementById('hero3d');

if (root.classList.contains('has-3d') && main && hero && canvas) {
    // GSAP owns every entrance now. Pull elements out of the CSS reveal
    // system before script.js's observer is attached (modules run first).
    document.querySelectorAll('.reveal').forEach((el) => el.classList.remove('reveal'));

    boot().catch((error) => {
        console.warn('[GETECH] 3D layer unavailable — using the 2D page.', error);
        root.classList.remove('is-cinematic');
        signal('fallback');
    });
}

function signal(state) {
    window.__motionState = state;
    if (state === 'fallback') root.classList.remove('has-3d');
    document.dispatchEvent(new CustomEvent(`motion:${state}`));
}

async function boot() {
    const [THREE, { gsap }, { ScrollTrigger }, { SplitText }, { default: Lenis }] = await Promise.all([
        import('three'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('gsap/SplitText'),
        import('lenis')
    ]);

    gsap.registerPlugin(ScrollTrigger, SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });

    // WebGL first: if it refuses, the page has not been touched yet.
    const scene = createScene(THREE, gsap);

    const stage = prepareStage();
    scene.resize();

    const lenis = initSmoothScroll(Lenis, gsap, ScrollTrigger);

    // Split and measure with the real fonts (the preloader is still up).
    if (document.fonts && document.fonts.ready) {
        await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
    }
    const { intro, chars } = buildIntro(gsap, SplitText, scene);
    buildFilm({ gsap, ScrollTrigger, lenis, scene, stage, chars });

    // Scrolling before the intro has finished: fast-forward it, so the intro
    // and the film never fight over the same hero elements.
    lenis.on('scroll', () => {
        if (window.scrollY > 4 && intro.progress() < 1 && !intro.vars.catchingUp) {
            intro.vars.catchingUp = true;
            gsap.to(intro, { progress: 1, duration: 0.35, ease: 'power2.out' });
        }
    });
    initTilt(gsap);

    scene.start();
    signal('ready');

    // The preloader fades for ~420ms; start while it is still dissolving.
    gsap.delayedCall(0.25, () => intro.play());

    // Web fonts change text metrics — re-measure everything once loaded.
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
}

/* -------------------------------------------------------------------------
   STAGE — turn the document into a fixed set of stacked scenes
   ------------------------------------------------------------------------- */
function prepareStage() {
    root.classList.add('is-cinematic');

    // The hero photo and the WebGL canvas become global, fixed layers.
    // (A fixed element inside a transformed scene would scroll with it.)
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.append(...hero.querySelectorAll('.hero__bg, .hero__scrim'));
    document.body.insertBefore(backdrop, main);
    document.body.insertBefore(canvas, main);

    // The only thing left in the flow: scroll length for the film.
    const spacer = document.createElement('div');
    spacer.className = 'scroll-space';
    spacer.setAttribute('aria-hidden', 'true');
    const footer = document.querySelector('.footer');
    (footer || main).after(spacer);

    // "Video scrubber": chapter name + progress line along the bottom edge.
    const reel = document.createElement('div');
    reel.className = 'reel';
    reel.setAttribute('aria-hidden', 'true');
    reel.innerHTML =
        '<div class="reel__meta"><span class="reel__index">01</span>' +
        '<span class="reel__line"></span><span class="reel__label"></span>' +
        '<span class="reel__total"></span></div>' +
        '<div class="reel__bar"><span class="reel__fill"></span></div>';
    document.body.appendChild(reel);

    // Partners: the flat marquee becomes a 3D ring of logo plates.
    const marquee = document.getElementById('partnerMarquee');
    if (marquee) {
        marquee.classList.add('is-ring');
        // Tilt and spin need separate elements: CSS applies rotateY before
        // rotateX on one element, which would make the ring wobble.
        const track = marquee.querySelector('.marquee__track');
        const spin = document.createElement('div');
        spin.className = 'marquee__spin';
        spin.append(...track.children);
        track.appendChild(spin);
        const plates = marquee.querySelectorAll('.partner');
        plates.forEach((plate, i) => plate.style.setProperty('--a', `${(360 / plates.length) * i}deg`));
    }

    return { backdrop, spacer, reel, footer };
}

/* -------------------------------------------------------------------------
   SMOOTH SCROLL
   ------------------------------------------------------------------------- */
function initSmoothScroll(Lenis, gsap, ScrollTrigger) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // Freeze while the mobile menu locks the page.
    const body = document.body;
    new MutationObserver(() => {
        body.classList.contains('is-locked') ? lenis.stop() : lenis.start();
    }).observe(body, { attributes: true, attributeFilter: ['class'] });

    return lenis;
}

/* -------------------------------------------------------------------------
   PARTICLE SCENE
   ------------------------------------------------------------------------- */
const BASE_Z = 8.5;
const TAU = Math.PI * 2;

// Index of each shape inside the shader, and the order the film visits them.
//   0 sphere · 1 sound terrain · 2 vinyl · 3 data columns · 4 tunnel · 5 galaxy
const SEQUENCE = [0, 1, 2, 3, 4, 5, 0];

const VERTEX = /* glsl */ `
    uniform float uTime;
    uniform float uAmp;
    uniform float uPulse;
    uniform float uScatter;
    uniform float uMix;
    uniform float uBurst;
    uniform float uSize;
    uniform float uScale;
    uniform float uPixelRatio;
    uniform float uAuto;
    uniform vec2  uPointer;
    uniform int   uFrom;
    uniform int   uTo;

    attribute vec3  aScatter;
    attribute float aSeed;
    attribute vec3  aWave;
    attribute vec3  aDisc;
    attribute vec3  aBars;
    attribute vec3  aTunnel;
    attribute vec3  aGalaxy;

    varying float vEnergy;
    varying float vAlpha;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
        const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g  = step(x0.yzx, x0.xyz);
        vec3 l  = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        vec3 ns = 0.142857142857 * D.wyz - D.xzx;
        vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x  = x_ * ns.x + ns.yyyy;
        vec4 y  = y_ * ns.x + ns.yyyy;
        vec4 h  = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
        m = m * m;
        return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }

    vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
    vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }

    vec3 shapeOf(int id) {
        if (id == 1) return aWave;
        if (id == 2) return aDisc;
        if (id == 3) return aBars;
        if (id == 4) return aTunnel;
        if (id == 5) return aGalaxy;
        return position;
    }

    // Each shape keeps moving on its own; energy drives colour, alpha fades.
    vec3 animateShape(int id, vec3 p, inout float energy, inout float alpha) {
        float t = uTime;

        if (id == 0) {                                   // sphere: sound on a globe
            float r = length(p);
            vec3 dir = p / r;
            float n    = snoise(dir * 1.4 + vec3(0.0, t * 0.12, t * 0.08));
            float band = sin(dir.y * 14.0 - t * 2.4 + n * 2.0);
            float disp = n * 0.17 * uAmp + band * 0.035 * uAmp + uPulse * 0.28 * (0.6 + 0.4 * n);
            float ry = uAuto + uPointer.x * 0.45;
            float rx = -uPointer.y * 0.25;
            p = rotX(rotY(dir * (r + disp), ry), rx);
            float facing = normalize((modelViewMatrix * vec4(rotX(rotY(dir, ry), rx), 0.0)).xyz).z;
            energy = clamp(disp * 3.2 + 0.45, 0.0, 1.0);
            alpha  = 0.28 + 0.72 * smoothstep(-0.5, 0.7, facing);

        } else if (id == 1) {                            // terrain: a field of sound waves
            float w = sin(p.x * 1.3 + t * 1.1) * 0.22 + sin(p.z * 2.1 - t * 0.8) * 0.12;
            float n = snoise(vec3(p.x * 0.45, p.z * 0.45, t * 0.18));
            p.y += (w + n * 0.35) * uAmp + uPulse * 0.3;
            energy = clamp(0.5 + p.y * 1.3, 0.0, 1.0);
            alpha  = 0.3 + 0.7 * smoothstep(-3.0, 1.5, p.z);
            p = rotX(rotY(p, uPointer.x * 0.25), 0.42 - uPointer.y * 0.1);

        } else if (id == 2) {                            // vinyl: spinning grooves, fixed sheen
            float r = length(p.xz);
            float a = atan(p.z, p.x) + t * 0.35;
            p.x = cos(a) * r;
            p.z = sin(a) * r;
            p.y += sin(r * 9.0 - t * 2.0) * 0.03 * uAmp;
            energy = 0.3 + 0.7 * pow(abs(cos(a - 0.7)), 10.0);
            alpha  = 0.9;
            p = rotY(rotX(p, 0.95 - uPointer.y * 0.2), uPointer.x * 0.35);

        } else if (id == 3) {                            // data columns that breathe
            float base = -1.2;
            float k = 0.7 + 0.3 * sin(t * 1.6 + p.x * 1.7 + p.z * 2.3);
            p.y = base + (p.y - base) * k * (0.85 + 0.15 * uAmp);
            energy = clamp((p.y - base) / 2.4, 0.0, 1.0);
            alpha  = 0.85;
            p = rotX(rotY(p, uAuto * 0.5 + uPointer.x * 0.4), 0.32 - uPointer.y * 0.15);

        } else if (id == 4) {                            // tunnel: light rushing past
            p.z = mod(p.z + 20.0 + t * 1.8, 27.0) - 20.0;
            float r = length(p.xy);
            float a = atan(p.y, p.x) + p.z * 0.04;
            p.x = cos(a) * r;
            p.y = sin(a) * r;
            energy = 0.5 + 0.5 * sin(p.z * 0.8 - t * 3.0);
            alpha  = smoothstep(-20.0, -12.0, p.z) * (1.0 - smoothstep(4.0, 7.0, p.z));
            p = rotX(rotY(p, uPointer.x * 0.12), -uPointer.y * 0.08);

        } else {                                         // galaxy: differential rotation
            float r = length(p.xz);
            float a = atan(p.z, p.x) + t * 0.25 / (r + 0.4);
            p.x = cos(a) * r;
            p.z = sin(a) * r;
            energy = clamp(1.0 - r / 2.6, 0.0, 1.0);
            alpha  = 0.9;
            p = rotY(rotX(p, 0.55 - uPointer.y * 0.2), uPointer.x * 0.4);
        }
        return p;
    }

    void main() {
        float eA = 0.5, aA = 1.0, eB = 0.5, aB = 1.0;
        vec3 pA = vec3(0.0);
        vec3 pB = vec3(0.0);
        if (uMix < 0.999) pA = animateShape(uFrom, shapeOf(uFrom), eA, aA);
        if (uMix > 0.001) pB = animateShape(uTo,   shapeOf(uTo),   eB, aB);

        vec3 pos = mix(pA, pB, uMix);
        pos *= 1.0 + uBurst * (0.1 + aSeed * 0.5);       // particles swell apart mid-morph
        pos  = mix(pos, aScatter, uScatter);             // intro: assemble from a cloud

        float energy = mix(eA, eB, uMix);
        float alpha  = mix(aA, aB, uMix);

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = uSize * uScale * uPixelRatio * (0.55 + aSeed * 0.9) * (0.8 + energy * 0.5) / max(-mv.z, 0.5);
        gl_PointSize = min(size, 26.0 * uPixelRatio);

        vEnergy = energy;
        vAlpha  = alpha;
    }
`;

const FRAGMENT = /* glsl */ `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uOpacity;

    varying float vEnergy;
    varying float vAlpha;

    void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float glow = pow(1.0 - d * 2.0, 1.7);
        vec3 color = mix(uColorA, uColorB, vEnergy);
        color = mix(color, vec3(1.0), smoothstep(0.82, 1.0, vEnergy) * 0.55);
        gl_FragColor = vec4(color, glow * vAlpha * uOpacity);
    }
`;

/** Target positions for every shape. All share one index → one particle. */
function buildShapes(count) {
    const make = () => new Float32Array(count * 3);
    const sphere = make(), scatter = make(), wave = make(), disc = make(),
          bars = make(), tunnel = make(), galaxy = make();
    const seeds = new Float32Array(count);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const rand = Math.random;
    const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;

    // Data columns: a 14 × 7 city of light pillars
    const COLS = 14, ROWS = 7;
    const columns = [];
    for (let cx = 0; cx < COLS; cx++) {
        for (let cz = 0; cz < ROWS; cz++) {
            columns.push({
                x: (cx - (COLS - 1) / 2) * 0.42,
                z: (cz - (ROWS - 1) / 2) * 0.42,
                h: 0.25 + Math.pow(rand(), 1.6) * 2.3
            });
        }
    }

    const waveCols = Math.ceil(Math.sqrt(count * 1.5));
    const waveRows = Math.ceil(count / waveCols);

    for (let i = 0; i < count; i++) {
        const k = i * 3;
        seeds[i] = rand();

        // 0 · Fibonacci sphere, 80% on the shell, the rest inside for volume
        const y = 1 - (i / (count - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const th = golden * i;
        const R = 1.55 * (rand() < 0.8 ? 1 + (rand() - 0.5) * 0.03 : 0.78 + rand() * 0.2);
        sphere[k] = Math.cos(th) * r * R;
        sphere[k + 1] = y * R;
        sphere[k + 2] = Math.sin(th) * r * R;

        // Intro cloud
        scatter[k] = (rand() - 0.5) * 14;
        scatter[k + 1] = (rand() - 0.5) * 9;
        scatter[k + 2] = (rand() - 0.5) * 8;

        // 1 · Terrain grid (displaced in the shader)
        const gx = i % waveCols;
        const gz = Math.floor(i / waveCols);
        wave[k] = (gx / (waveCols - 1) - 0.5) * 9 + (rand() - 0.5) * 0.04;
        wave[k + 1] = 0;
        wave[k + 2] = (gz / Math.max(waveRows - 1, 1) - 0.5) * 6;

        // 2 · Vinyl: 42 grooves around a label hole
        const groove = Math.floor(rand() * 42);
        const dr = 0.55 + (groove / 41) * 1.75 + (rand() - 0.5) * 0.012;
        const da = rand() * TAU;
        disc[k] = Math.cos(da) * dr;
        disc[k + 1] = (rand() - 0.5) * 0.015;
        disc[k + 2] = Math.sin(da) * dr;

        // 3 · Columns
        const col = columns[i % columns.length];
        bars[k] = col.x + (rand() - 0.5) * 0.05;
        bars[k + 1] = -1.2 + rand() * col.h;
        bars[k + 2] = col.z + (rand() - 0.5) * 0.05;

        // 4 · Tunnel along z
        const ta = rand() * TAU;
        const tr = 2.6 + (rand() - 0.5) * 0.18;
        tunnel[k] = Math.cos(ta) * tr;
        tunnel[k + 1] = Math.sin(ta) * tr;
        tunnel[k + 2] = -20 + rand() * 27;

        // 5 · Galaxy: three arms and a bright core
        if (rand() < 0.1) {
            const cr = Math.pow(rand(), 2) * 0.35;
            const ca = rand() * TAU;
            galaxy[k] = Math.cos(ca) * cr;
            galaxy[k + 1] = gauss() * 0.12;
            galaxy[k + 2] = Math.sin(ca) * cr;
        } else {
            const arm = i % 3;
            const gr = Math.pow(rand(), 0.7) * 2.6;
            const ga = (arm * TAU) / 3 + gr * 1.9 + (rand() - 0.5) * (0.5 / (gr + 0.3));
            galaxy[k] = Math.cos(ga) * gr;
            galaxy[k + 1] = gauss() * 0.08 * (1.2 - gr / 2.6);
            galaxy[k + 2] = Math.sin(ga) * gr;
        }
    }

    return { sphere, scatter, wave, disc, bars, tunnel, galaxy, seeds };
}

function createScene(THREE, gsap) {
    const small = window.innerWidth < 768;

    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
    camera.position.set(0, 0, BASE_Z);

    // rig: placement per scene · spin: rotation for the ring + orbits
    const rig  = new THREE.Group();
    const spin = new THREE.Group();
    rig.add(spin);
    scene.add(rig);

    const linear = (hex) => new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace);

    /* ---- Morphing particles ------------------------------------------- */
    const COUNT = small ? 7000 : 16000;
    const shapes = buildShapes(COUNT);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(shapes.sphere, 3));
    geo.setAttribute('aScatter', new THREE.BufferAttribute(shapes.scatter, 3));
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(shapes.seeds, 1));
    geo.setAttribute('aWave',    new THREE.BufferAttribute(shapes.wave, 3));
    geo.setAttribute('aDisc',    new THREE.BufferAttribute(shapes.disc, 3));
    geo.setAttribute('aBars',    new THREE.BufferAttribute(shapes.bars, 3));
    geo.setAttribute('aTunnel',  new THREE.BufferAttribute(shapes.tunnel, 3));
    geo.setAttribute('aGalaxy',  new THREE.BufferAttribute(shapes.galaxy, 3));

    const uniforms = {
        uTime:       { value: 0 },
        uAmp:        { value: 1 },
        uPulse:      { value: 0 },
        uScatter:    { value: 1 },
        uMix:        { value: 0 },
        uBurst:      { value: 0 },
        uSize:       { value: 24 },
        uScale:      { value: 1 },
        uPixelRatio: { value: 1 },
        uAuto:       { value: 0 },
        uPointer:    { value: new THREE.Vector2() },
        uFrom:       { value: 0 },
        uTo:         { value: 0 },
        uOpacity:    { value: 0.9 },
        uColorA:     { value: linear('#1667FF') },
        uColorB:     { value: linear('#22D3FF') }
    };

    const points = new THREE.Points(geo, new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    }));
    points.frustumCulled = false;      // shapes reach far beyond the sphere's bounds
    rig.add(points);

    /* ---- Equalizer ring ----------------------------------------------- */
    const BARS = small ? 96 : 144;
    const RING_R = 2.05;
    const barGeo = new THREE.BoxGeometry(0.014, 1, 0.014);
    barGeo.translate(0, 0.5, 0);
    const barMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    const bars = new THREE.InstancedMesh(barGeo, barMat, BARS);
    bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const colorA = new THREE.Color('#1667FF');
    const colorB = new THREE.Color('#22D3FF');
    const tmpColor = new THREE.Color();
    for (let i = 0; i < BARS; i++) {
        bars.setColorAt(i, tmpColor.lerpColors(colorA, colorB, 0.5 + 0.5 * Math.sin((i / BARS) * TAU)));
    }
    const ringSpin = new THREE.Group();
    ringSpin.add(bars);
    const ringTilt = new THREE.Group();
    ringTilt.rotation.set(1.18, 0, 0.32);
    ringTilt.add(ringSpin);
    spin.add(ringTilt);

    const dummy = new THREE.Object3D();
    const updateBars = (t, energy) => {
        for (let i = 0; i < BARS; i++) {
            const a = (i / BARS) * TAU;
            const level =
                (0.5 + 0.5 * Math.sin(a * 4 + t * 2.0)) *
                (0.5 + 0.5 * Math.sin(a * 11 - t * 3.1)) *
                (0.6 + 0.4 * Math.sin(t * 7 + i * 1.7));
            dummy.position.set(Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0);
            dummy.rotation.set(0, 0, a - Math.PI / 2);
            dummy.scale.set(1, 0.04 + level * 0.42 * energy, 1);
            dummy.updateMatrix();
            bars.setMatrixAt(i, dummy.matrix);
        }
        bars.instanceMatrix.needsUpdate = true;
    };

    /* ---- Orbits with satellites --------------------------------------- */
    const orbits = [
        { radius: 2.55, tilt: [1.35, 0.25, -0.4], speed: 0.35, opacity: 0.22 },
        { radius: 2.95, tilt: [1.0, -0.5, 0.6],   speed: -0.22, opacity: 0.14 }
    ].map(({ radius, tilt, speed, opacity }) => {
        const pts = [];
        for (let i = 0; i < 160; i++) {
            const a = (i / 160) * TAU;
            pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
        }
        const line = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({
                color: 0x6fb6ff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            })
        );
        const satellite = new THREE.Mesh(
            new THREE.SphereGeometry(0.032, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xbff3ff, transparent: true, opacity: 0 })
        );
        const group = new THREE.Group();
        group.rotation.set(...tilt);
        group.add(line, satellite);
        spin.add(group);
        return { radius, speed, opacity, line, satellite };
    });

    /* ---- Background dust ---------------------------------------------- */
    const DUST = small ? 450 : 1100;
    const dustPos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
        dustPos[i * 3]     = (Math.random() - 0.5) * 26;
        dustPos[i * 3 + 1] = (Math.random() - 0.5) * 15;
        dustPos[i * 3 + 2] = -12 + Math.random() * 14;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
        size: 0.05, map: softDot(THREE), color: 0x9db2d0,
        transparent: true, opacity: 0.55, depthWrite: false,
        blending: THREE.AdditiveBlending
    }));
    scene.add(dust);

    /* ---- State driven by GSAP ----------------------------------------- */
    const state = {
        // scroll-driven pose (see POSES in buildFilm)
        morph: 0, rx: 0, ry: 0, rs: 1, op: 0.9, ring: 1, fly: 0,
        // intro-only
        introZ: 6, introRing: 0
    };

    /* ---- Layout ------------------------------------------------------- */
    const view = { w: 1, h: 1, base: 1 };
    const resize = () => {
        const width  = canvas.clientWidth  || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;
        const mobile = window.innerWidth < 768;

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        view.h = 2 * BASE_Z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        view.w = view.h * camera.aspect;
        view.base = camera.aspect < 0.95 ? Math.min(1, view.w / 5.6) : Math.min(1.1, view.h / 5.2);
        uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };
    resize();

    let resizeQueued = false;
    window.addEventListener('resize', () => {
        if (resizeQueued) return;
        resizeQueued = true;
        requestAnimationFrame(() => { resizeQueued = false; resize(); });
    }, { passive: true });

    /* ---- Pointer ------------------------------------------------------ */
    const pointer = { x: 0, y: 0 };
    const smooth  = { x: 0, y: 0 };
    let energy = 0;
    let last = null;

    window.addEventListener('pointermove', (event) => {
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -((event.clientY / window.innerHeight) * 2 - 1);
        if (last) energy = Math.min(energy + Math.hypot(x - last.x, y - last.y) * 1.6, 1.4);
        last = { x, y };
        pointer.x = x;
        pointer.y = y;
    }, { passive: true });

    // Tap empty space anywhere: a "beat" ripples through the particles.
    window.addEventListener('pointerdown', (event) => {
        if (event.target.closest('a, button, input, .header, .mobile-menu')) return;
        gsap.fromTo(uniforms.uPulse, { value: 1 }, { value: 0, duration: 1.6, ease: 'power3.out' });
    });

    /* ---- Render loop -------------------------------------------------- */
    const clock = new THREE.Clock();
    let autoRot = 0;

    const frame = () => {
        const dt = Math.min(clock.getDelta(), 0.05);
        const t  = clock.elapsedTime;
        const follow = 1 - Math.exp(-dt * 3);

        smooth.x += (pointer.x - smooth.x) * follow;
        smooth.y += (pointer.y - smooth.y) * follow;
        energy *= Math.exp(-dt * 1.6);
        autoRot += dt * 0.06;

        // Morph: which two shapes, and how far between them
        const m = Math.max(0, Math.min(state.morph, SEQUENCE.length - 1));
        const i = Math.min(Math.floor(m), SEQUENCE.length - 2);
        const f = Math.min(Math.max(m - i, 0), 1);
        uniforms.uFrom.value  = SEQUENCE[i];
        uniforms.uTo.value    = SEQUENCE[i + 1];
        uniforms.uMix.value   = f * f * (3 - 2 * f);
        uniforms.uBurst.value = Math.sin(Math.PI * f);

        uniforms.uTime.value = t;
        uniforms.uAmp.value  = 1 + energy;
        uniforms.uAuto.value = autoRot;
        uniforms.uPointer.value.set(smooth.x, smooth.y);

        const scale = view.base * state.rs;
        rig.position.set(state.rx * view.w, state.ry * view.h, 0);
        rig.scale.setScalar(scale);
        uniforms.uScale.value = Math.sqrt(scale);
        // Mid-morph the cloud brightens: it carries the frame between scenes
        uniforms.uOpacity.value = state.op * (1 + 0.6 * uniforms.uBurst.value);

        spin.rotation.y = autoRot + smooth.x * 0.45;
        spin.rotation.x = -smooth.y * 0.25;

        const ringOn = state.ring * state.introRing;
        ringSpin.rotation.z = t * 0.12;
        ringTilt.scale.setScalar(0.6 + 0.4 * ringOn);
        ringTilt.visible = ringOn > 0.002;
        barMat.opacity = 0.75 * ringOn;
        if (ringTilt.visible) updateBars(t, (1 + energy * 1.2 + uniforms.uPulse.value * 1.5) * ringOn);
        orbits.forEach((orbit) => {
            const a = t * orbit.speed;
            orbit.satellite.position.set(Math.cos(a) * orbit.radius, Math.sin(a) * orbit.radius, 0);
            orbit.line.material.opacity = orbit.opacity * ringOn;
            orbit.satellite.material.opacity = ringOn;
        });

        dust.rotation.y = t * 0.012;
        dust.position.x = -smooth.x * 0.35;
        dust.position.y = -smooth.y * 0.2;

        camera.position.x = smooth.x * 0.3;
        camera.position.y = smooth.y * 0.18;
        camera.position.z = BASE_Z + state.introZ - state.fly;
        camera.lookAt(0, 0, -state.fly);

        renderer.render(scene, camera);
    };

    let started = false;
    const sync = () => renderer.setAnimationLoop(started && !document.hidden ? frame : null);
    document.addEventListener('visibilitychange', sync);

    return {
        uniforms,
        state,
        resize,
        start() { started = true; frame(); sync(); }
    };
}

/** Small radial sprite so dust renders as soft dots, not squares. */
function softDot(THREE) {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
}

/* -------------------------------------------------------------------------
   INTRO — plays once on load, independent of scroll
   ------------------------------------------------------------------------- */
function buildIntro(gsap, SplitText, scene) {
    const title = hero.querySelector('.hero__title');
    const word  = hero.querySelector('.hero__word');
    const cue   = hero.querySelector('.hero__scroll');
    const copy  = hero.querySelectorAll('.hero__eyebrow, .hero__kicker, .hero__lead, .hero__actions');

    // GETECH is a brand mark — never translated — so splitting it is safe.
    const split = new SplitText(word, { type: 'chars', charsClass: 'hero__char' });
    word.classList.add('is-split');

    const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    intro
        .to(scene.uniforms.uScatter, { value: 0, duration: 2.8, ease: 'expo.inOut' }, 0)
        .to(scene.state, { introZ: 0, duration: 3, ease: 'expo.inOut' }, 0)
        .to(scene.state, { introRing: 1, duration: 1.8, ease: 'power2.out' }, 1.3)
        .from(split.chars, {
            yPercent: 40, rotationX: -95, z: -140, opacity: 0,
            transformOrigin: '50% 100% -40px', duration: 1.6, stagger: 0.07
        }, 0.7)
        .from(copy, { y: 34, opacity: 0, duration: 1.2, stagger: 0.09 }, 1.05);
    if (cue) intro.from(cue, { opacity: 0, duration: 1 }, 1.6);

    // The headline leans toward the cursor (mouse / trackpad only).
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        gsap.set(title, { transformPerspective: 1200 });
        const rotY = gsap.quickTo(title, 'rotationY', { duration: 0.9, ease: 'power3' });
        const rotX = gsap.quickTo(title, 'rotationX', { duration: 0.9, ease: 'power3' });
        hero.addEventListener('pointermove', (event) => {
            rotY((event.clientX / window.innerWidth - 0.5) * 14);
            rotX(-(event.clientY / window.innerHeight - 0.5) * 10);
        });
        hero.addEventListener('pointerleave', () => { rotY(0); rotX(0); });
    }

    return { intro, chars: split.chars };
}

/* -------------------------------------------------------------------------
   THE FILM — one scrubbed timeline for the whole page
   ------------------------------------------------------------------------- */
function buildFilm({ gsap, ScrollTrigger, lenis, scene, stage, chars }) {
    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    const TR   = 1.2;    // length of a scene change, in timeline units
    const UNIT = 0.85;   // viewport heights of scrolling per timeline unit

    const portrait = () => window.innerWidth / window.innerHeight < 0.95;
    const stageH   = () => main.clientHeight || window.innerHeight;
    const overflowY = (el) => Math.max(0, el.offsetHeight - stageH());
    const overflowX = (el) => (el ? Math.max(0, el.scrollWidth - el.clientWidth) : 0);

    const el = {
        ticker:   $('.ticker'),
        about:    $('#about'),
        services: $('#services'),
        stats:    $('#stats'),
        partners: $('#partners'),
        news:     $('#news'),
        contact:  $('#contact'),
        footer:   stage.footer
    };

    // Where the particles go, and what they become, in each chapter.
    // Values may be functions: they are re-evaluated on every resize.
    const POSES = {
        home:     { morph: 0, rx: () => (portrait() ? 0 : 0.22), ry: () => (portrait() ? 0.25 : 0), rs: 1, op: 0.9, ring: 1, fly: 0 },
        about:    { morph: 1, rx: 0, ry: () => (portrait() ? -0.3 : -0.22), rs: 1.2, op: 0.8, ring: 0, fly: 0 },
        services: { morph: 2, rx: 0, ry: () => (portrait() ? 0.28 : 0), rs: 1.2, op: 0.5, ring: 0, fly: 0 },
        stats:    { morph: 3, rx: 0, ry: -0.12, rs: 1.1, op: 0.6, ring: 0, fly: 0 },
        partners: { morph: 4, rx: 0, ry: 0, rs: 1, op: 0.9, ring: 0, fly: 0 },
        news:     { morph: 5, rx: () => (portrait() ? 0 : 0.26), ry: () => (portrait() ? 0.3 : 0.12), rs: 1, op: 0.7, ring: 0, fly: 0 },
        contact:  { morph: 6, rx: 0, ry: 0, rs: 1.35, op: 0.45, ring: 0.35, fly: 0 },
        footer:   { morph: 6, rx: 0, ry: () => (portrait() ? 0.24 : 0.2), rs: 1, op: 0.35, ring: 0.35, fly: 0 }
    };

    const chapters = [
        { id: 'home',     el: hero,        hold: 0.3, nav: 'home' },
        { id: 'about',    el: el.about,    hold: 1.0, nav: 'about' },
        { id: 'services', el: el.services, hold: 1.1, nav: 'services' },
        { id: 'stats',    el: el.stats,    hold: 1.0, nav: null },
        { id: 'partners', el: el.partners, hold: 1.4, nav: null },
        { id: 'news',     el: el.news,     hold: 1.1, nav: 'news' },
        { id: 'contact',  el: el.contact,  hold: 0.8, nav: 'contact' },
        { id: 'footer',   el: el.footer,   hold: 0.5, nav: 'contact' }
    ].filter((c) => c.el);

    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    const counters = [];   // stat numbers, rendered in onUpdate

    /* ---- Initial state ------------------------------------------------ */
    gsap.set(main, { perspective: 1400 });
    chapters.forEach((c) => { if (c.el !== hero && c.el !== el.footer) gsap.set(c.el, { opacity: 0 }); });
    gsap.set(hero, { opacity: 1 });
    if (el.footer) gsap.set(el.footer, { yPercent: 100 });
    if (el.ticker) gsap.set(el.ticker, { yPercent: -50, opacity: 0 });
    Object.assign(scene.state, resolve(POSES.home));

    // Elements that fold up in 3D get their own perspective, so they turn
    // around their own centre — never skewed by the stage's vanishing point.
    const fold = (targets) => gsap.set(targets, { transformPerspective: 900, transformOrigin: '50% 100%' });

    // Entrances: the start state is applied OUTSIDE the timeline, then the
    // timeline only tweens *to* the end state. A ScrollTrigger refresh reverts
    // timeline tweens; with fromTo() that wiped the start state and elements
    // flashed fully visible, then popped back to hidden when their cue came.
    const play = (targets, from, to, at) => {
        if (!targets || (Array.isArray(targets) && !targets.length)) return;
        gsap.set(targets, from);
        tl.to(targets, to, at);
    };

    // Hand-over, not crossfade: the outgoing scene is gone by mid-cut and the
    // incoming one only fades up after it. Pause anywhere and you never get
    // two layers of text on top of each other; mid-cut belongs to the particles.
    // Old scene: gone by 45% of the cut. New scene: from 40%, so a pause at
    // mid-cut shows the next scene emerging faintly — never both at once.
    const arrive = (cut, scene, from, to, at) => {
        play(scene, { ...from, opacity: 0 }, to, at);
        tl.to(scene, { opacity: 1, duration: TR * 0.6, ease: 'power1.out' }, cut + TR * 0.4);
    };
    const leave = (cut, scene, vars) => {
        tl.to(scene, { duration: TR, ...vars }, cut);
        tl.to(scene, { opacity: 0, duration: TR * 0.45, ease: 'none' }, cut);
    };

    const rise = (targets, at, { y = 50, stagger = 0.08, duration = TR * 0.6 } = {}) => {
        if (!targets || (Array.isArray(targets) && !targets.length)) return;
        fold(targets);
        play(targets,
            { opacity: 0, y, rotationX: -35 },
            { opacity: 1, y: 0, rotationX: 0, duration, stagger, ease: 'power3.out' }, at);
    };

    /* ---- Scene entrances --------------------------------------------- */
    const enters = {
        about(t) {
            const c = el.about;
            // Ends exactly at the cut's end, where the hold's slow dolly takes over z
            arrive(t, c, { z: -700 }, { z: 0, duration: TR * 0.75, ease: 'power3.out' }, t + TR * 0.25);
            const main1 = $('.about__img--main', c);
            const sub = $('.about__img--sub', c);
            const badge = $('.about__badge', c);
            gsap.set([main1, sub], { transformPerspective: 1000 });
            if (main1) play(main1, { opacity: 0, rotationY: 35, z: -300, xPercent: -20 },
                { opacity: 1, rotationY: 0, z: 0, xPercent: 0, duration: TR * 0.65, ease: 'power3.out' }, t + TR * 0.35);
            if (sub) play(sub, { opacity: 0, y: 160, z: 200, rotationX: -25 },
                { opacity: 1, y: 0, z: 0, rotationX: 0, duration: TR * 0.5, ease: 'power3.out' }, t + TR * 0.5);
            if (badge) play(badge, { opacity: 0, scale: 0.4, rotation: -12 },
                { opacity: 1, scale: 1, rotation: 0, duration: TR * 0.3, ease: 'back.out(1.6)' }, t + TR * 0.7);
            rise($$('.about__body > *', c), t + TR * 0.45);
        },
        services(t) {
            const c = el.services;
            arrive(t, c, { xPercent: 35, rotationY: -50, z: -400 },
                { xPercent: 0, rotationY: 0, z: 0, duration: TR }, t);
            rise($$('.section__head > *', c), t + TR * 0.4);
            const cards = $$('.card', c);
            gsap.set(cards, { transformPerspective: 1000, transformOrigin: '0% 50%' });
            play(cards, { opacity: 0, rotationY: -70, z: -300, x: 120 },
                { opacity: 1, rotationY: 0, z: 0, x: 0, duration: TR * 0.7, stagger: 0.12, ease: 'power3.out' }, t + TR * 0.45);
        },
        stats(t) {
            const c = el.stats;
            arrive(t, c, { yPercent: 30, rotationX: -35, z: -300 },
                { yPercent: 0, rotationX: 0, z: 0, duration: TR }, t);
            rise($$('.stats__head > *', c), t + TR * 0.4);
            const cells = $$('.stat', c);
            gsap.set(cells, { transformPerspective: 900, transformOrigin: '50% 0%' });
            play(cells, { opacity: 0, rotationX: -80, y: 40 },
                { opacity: 1, rotationX: 0, y: 0, duration: TR * 0.6, stagger: 0.08, ease: 'power3.out' }, t + TR * 0.5);

            // Numbers count with the scroll — scrub back and they count down.
            // The text is written from the film's own onUpdate (see below):
            // a tween's onUpdate is skipped when the playhead jumps over it.
            $$('[data-count]', c).forEach((num, i) => {
                const target = parseFloat(num.dataset.count) || 0;
                const counter = { v: 0, num, suffix: num.dataset.suffix || '', shown: null };
                counters.push(counter);
                tl.to(counter, { v: target, duration: TR * 0.5, ease: 'power2.out' },
                    t + TR * 0.35 + i * 0.04);       // done before the scene settles
            });
        },
        partners(t) {
            const c = el.partners;
            arrive(t, c, { z: -1400 }, { z: 0, duration: TR * 0.8, ease: 'power3.out' }, t + TR * 0.2);
            rise($$('.section__head > *', c), t + TR * 0.45);
            const track = $('.marquee__track', c);
            if (track) play(track, { opacity: 0, rotationX: 75, scale: 0.5 },
                { opacity: 1, rotationX: -8, scale: 1, duration: TR * 0.6, ease: 'power3.out' }, t + TR * 0.4);
        },
        news(t) {
            const c = el.news;
            arrive(t, c, { z: -900 }, { z: 0, duration: TR * 0.8, ease: 'power3.out' }, t + TR * 0.2);
            rise($$('.section__head--split > div > *, .section__head--split > a', c), t + TR * 0.4);
            const cards = $$('.news-card', c);
            gsap.set(cards, { transformPerspective: 1100, transformOrigin: '50% 100%' });
            play(cards, { opacity: 0, z: -800, rotationX: 50, y: 200 },
                { opacity: 1, z: 0, rotationX: 0, y: 0, duration: TR * 0.7, stagger: 0.12, ease: 'power3.out' }, t + TR * 0.4);
        },
        contact(t) {
            const c = el.contact;
            arrive(t, c, { z: 600 }, { z: 0, duration: TR * 0.75, ease: 'power3.out' }, t + TR * 0.25);
            rise($$('.cta__inner > *', c), t + TR * 0.45, { y: 70, stagger: 0.1 });
        },
        footer(t) {
            const f = el.footer;
            play(f, { yPercent: 100 }, { yPercent: 0, duration: TR, ease: 'power3.out' }, t);
            rise($$('.footer__grid > *, .footer__bottom', f), t + TR * 0.3, { y: 40, stagger: 0.07 });
        }
    };

    /* ---- Scene exits -------------------------------------------------- */
    const exits = {
        home(t) {
            const copy = $$('.hero__eyebrow, .hero__kicker, .hero__lead, .hero__actions', hero);
            // fromTo + immediateRender:false: safe even if the intro is still running
            tl.fromTo(copy, { y: 0, opacity: 1 },
                { y: -60, opacity: 0, duration: TR * 0.45, stagger: 0.04, ease: 'power2.in', immediateRender: false }, t);
            const cue = $('.hero__scroll', hero);
            if (cue) tl.fromTo(cue, { opacity: 1 }, { opacity: 0, duration: TR * 0.3, immediateRender: false }, t);
            // GETECH letters scatter past the camera
            tl.fromTo(chars, { z: 0, xPercent: 0, rotationY: 0, opacity: 1 }, {
                z: (i) => 380 + Math.abs(i - 2.5) * 160,
                xPercent: (i) => (i - 2.5) * 70,
                rotationY: (i) => (i - 2.5) * 14,
                opacity: 0,
                duration: TR * 0.8,
                stagger: { each: 0.03, from: 'center' },
                ease: 'power2.in',
                immediateRender: false
            }, t);
            tl.fromTo(hero, { z: 0 }, { z: 500, duration: TR * 0.9, ease: 'power2.in', immediateRender: false }, t);
            tl.fromTo(hero, { opacity: 1 }, { opacity: 0, duration: TR * 0.45, ease: 'none', immediateRender: false }, t);
            tl.to(stage.backdrop, { opacity: 0, duration: TR }, t);

            // The service ticker sweeps across the cut like a tape
            if (el.ticker) {
                play(el.ticker, { opacity: 0, xPercent: 10, rotation: -7 },
                    { opacity: 1, xPercent: 0, rotation: -5, duration: TR * 0.45, ease: 'power2.out' }, t + TR * 0.1);
                tl.to(el.ticker,{ opacity: 0, xPercent: -10, rotation: -3, duration: TR * 0.45, ease: 'power2.in' }, t + TR * 0.55);
            }
        },
        about(t) {
            leave(t, el.about, { xPercent: -35, rotationY: 50, z: -400 });
        },
        services(t) {
            leave(t, el.services, { yPercent: -30, rotationX: 35, z: -300 });
        },
        stats(t) {
            leave(t, el.stats, { z: 700, duration: TR * 0.8, ease: 'power2.in' });
        },
        partners(t) {
            leave(t, el.partners, { z: 900, duration: TR * 0.8, ease: 'power2.in' });
        },
        news(t) {
            leave(t, el.news, { scale: 0.8, z: -200, duration: TR * 0.8, ease: 'power2.in' });
        },
        contact(t) {
            // Rises just enough for the footer to roll in beneath it
            const inner = $('.cta__inner', el.contact);
            const lift = () => {
                const footerH = el.footer ? el.footer.offsetHeight : 0;
                const bottom = inner ? inner.offsetTop + inner.offsetHeight : el.contact.offsetHeight / 2;
                return -Math.max(0, bottom + 24 - (stageH() - footerH));
            };
            tl.to(el.contact, { y: lift, scale: 0.94, duration: TR }, t);
        }
    };

    /* ---- While a scene is on screen ----------------------------------- */
    const holds = {
        about(t, d) {
            // yPercent, not y: the entrance animates y and may still be settling
            tl.to($('.about__img--main', el.about), { yPercent: -4, duration: d, ease: 'none' }, t);
            tl.to($('.about__img--sub', el.about), { yPercent: -12, duration: d, ease: 'none' }, t);
        },
        services(t, d) {
            // Narrow screens: the cards travel sideways like a dolly shot
            const grid = $('.services__grid', el.services);
            tl.fromTo(grid, { x: 0 }, { x: () => -overflowX(grid), duration: d * 0.8, ease: 'none', immediateRender: false }, t + d * 0.1);
        },
        partners(t, d) {
            const spinner = $('.marquee__spin', el.partners);
            if (spinner) tl.fromTo(spinner, { rotationY: 0 }, { rotationY: -160, duration: d, ease: 'none', immediateRender: false }, t);
            tl.to(scene.state, { fly: 4.5, duration: d, ease: 'none' }, t);   // fly into the tunnel
        },
        news(t, d) {
            const grid = $('.news__grid', el.news);
            tl.fromTo(grid, { x: 0 }, { x: () => -overflowX(grid), duration: d * 0.8, ease: 'none', immediateRender: false }, t + d * 0.1);
        }
    };

    /* ---- Assemble ------------------------------------------------------ */
    let cursor = 0;
    chapters.forEach((chapter, i) => {
        chapter.start = cursor;
        tl.addLabel(chapter.id, cursor);

        const hold = chapter.hold;
        if (chapter.el !== hero && chapter.el !== el.footer) {
            // Slow dolly back keeps the frame alive while you read
            tl.to(chapter.el, { z: -80, duration: hold, ease: 'none' }, cursor);
            // Content taller than the screen pans past the lens
            tl.fromTo(chapter.el, { y: 0 }, {
                y: () => -overflowY(chapter.el), duration: hold * 0.8, ease: 'none', immediateRender: false
            }, cursor + hold * 0.1);
        }
        holds[chapter.id]?.(cursor, hold);

        cursor += hold;
        chapter.end = cursor;
        tl.addLabel(`${chapter.id}-end`, cursor);

        const next = chapters[i + 1];
        if (next) {
            exits[chapter.id]?.(cursor);
            enters[next.id]?.(cursor);
            tl.to(scene.state, { ...POSES[next.id], duration: TR, ease: 'power2.inOut' }, cursor);
            cursor += TR;
        }
    });

    /* ---- Scroll length + the trigger ---------------------------------- */
    const setLength = () => {
        stage.spacer.style.height = `${Math.round(tl.duration() * UNIT * window.innerHeight + window.innerHeight)}px`;
    };
    setLength();
    ScrollTrigger.addEventListener('refreshInit', setLength);

    const st = ScrollTrigger.create({
        trigger: stage.spacer,
        start: 'top top',
        end: 'bottom bottom',
        animation: tl,
        // true = no second smoothing layer. Lenis already eases the wheel;
        // stacking a scrub delay on top made scenes keep sliding after release.
        scrub: true,
        invalidateOnRefresh: true
    });

    /* ---- Chapter tracking: interactivity, nav, reel ------------------- */
    const navLinks = $$('.nav__link');
    const reelIndex = $('.reel__index', stage.reel);
    const reelLabel = $('.reel__label', stage.reel);
    const reelFill  = $('.reel__fill', stage.reel);
    const reelBar   = $('.reel__bar', stage.reel);
    const titled    = chapters.filter((c) => c.id !== 'footer');
    $('.reel__total', stage.reel).textContent = `/ ${String(titled.length).padStart(2, '0')}`;

    // A tick on the scrubber for every chapter
    titled.forEach((c) => {
        const tick = document.createElement('i');
        tick.className = 'reel__tick';
        tick.style.left = `${(c.start / tl.duration()) * 100}%`;
        reelBar.appendChild(tick);
    });

    const chapterName = (c) => {
        if (c.id === 'home') return ($('.nav__link[href="#home"]') || {}).textContent || 'GETECH';
        return ($('.eyebrow', c.el) || {}).textContent || c.id.toUpperCase();
    };

    let current = null;
    const setChapter = (chapter) => {
        if (chapter === current) return;
        current = chapter;

        // Only the scene on screen (plus the CTA above the footer) is clickable
        chapters.forEach((c) => c.el.classList.remove('is-current'));
        chapter.el.classList.add('is-current');
        if (chapter.id === 'footer') el.contact?.classList.add('is-current');

        navLinks.forEach((link) => {
            const on = chapter.nav && link.getAttribute('href') === `#${chapter.nav}`;
            link.classList.toggle('is-active', !!on);
            on ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current');
        });

        stage.reel.classList.toggle('is-end', chapter.id === 'footer');   // footer has its own bottom line
        const shown = chapter.id === 'footer' ? titled[titled.length - 1] : chapter;
        reelIndex.textContent = String(titled.indexOf(shown) + 1).padStart(2, '0');
        reelLabel.textContent = chapterName(shown);
        gsap.fromTo([reelIndex, reelLabel], { yPercent: 100, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', overwrite: true });
    };

    const onUpdate = () => {
        const time = tl.time();
        let found = chapters[0];
        for (const c of chapters) if (time >= c.start - TR * 0.5) found = c;
        setChapter(found);
        reelFill.style.transform = `scaleX(${tl.progress().toFixed(4)})`;
        for (const c of counters) {
            const text = Math.round(c.v) + c.suffix;
            if (text !== c.shown) c.num.textContent = c.shown = text;
        }
    };
    tl.eventCallback('onUpdate', onUpdate);
    onUpdate();

    // Language switch: refresh the chapter label
    $$('[data-lang-btn]').forEach((btn) => btn.addEventListener('click', () => {
        setTimeout(() => { if (current) reelLabel.textContent = chapterName(current.id === 'footer' ? titled[titled.length - 1] : current); }, 0);
    }));

    /* ---- Navigation: jump the playhead -------------------------------- */
    const byId = Object.fromEntries(chapters.map((c) => [c.id, c]));
    const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const go = (id, { immediate = false } = {}) => {
        if (!byId[id]) return;
        const y = st.labelToScroll(id);
        const distance = Math.abs(y - window.scrollY);
        if (!document.body.classList.contains('is-locked')) lenis.start();
        lenis.scrollTo(y, {
            immediate,
            duration: Math.min(0.9 + distance / 5000, 2.6),
            easing: easeInOut
        });
    };

    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[href^="#"]');
        if (!link || link.classList.contains('skip-link')) return;
        const id = link.getAttribute('href').slice(1);
        if (!byId[id]) return;
        event.preventDefault();
        go(id);
        history.replaceState(null, '', `#${id}`);
    });

    // Keyboard users: tabbing into a hidden scene brings it on screen
    document.addEventListener('focusin', (event) => {
        const scene = chapters.find((c) => c.el.contains(event.target));
        if (scene && scene !== current && event.target.matches(':focus-visible')) go(scene.id);
    });

    // No snapping: like pausing a video, letting go mid-cut freezes the frame
    // exactly there. The playhead follows Lenis' eased scroll 1:1.

    /* ---- Start: from the top, or at the chapter in the URL ------------- */
    const hash = location.hash.slice(1);
    if (hash && byId[hash]) {
        requestAnimationFrame(() => go(hash, { immediate: true }));
    } else {
        window.scrollTo(0, 0);
    }

    // Handy in DevTools: __film.go('news'), __film.timeline.progress()
    window.__film = { timeline: tl, trigger: st, go };
    return { tl, st };
}

/** Resolve a pose once (functions → values) for the initial state. */
function resolve(pose) {
    const out = {};
    for (const [key, value] of Object.entries(pose)) out[key] = typeof value === 'function' ? value() : value;
    return out;
}

/* -------------------------------------------------------------------------
   CARD TILT — cards lean toward the cursor, with a moving glare
   ------------------------------------------------------------------------- */
function initTilt(gsap) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    document.querySelectorAll('.card, .news-card').forEach((card) => {
        const rotX = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
        const rotY = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });

        card.addEventListener('pointermove', (event) => {
            const r = card.getBoundingClientRect();
            const x = (event.clientX - r.left) / r.width;
            const y = (event.clientY - r.top) / r.height;
            rotY((x - 0.5) * 12);
            rotX(-(y - 0.5) * 10);
            card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
            card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        });
        card.addEventListener('pointerleave', () => { rotX(0); rotY(0); });
    });
}
