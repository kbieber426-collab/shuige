import * as THREE from "three";
import type { SceneQuality } from "../lib/perf";
import { scrollState, type OrbitObjectData } from "../lib/state";

interface OrbitBody {
  mesh: THREE.Mesh;
  radius: number;
  speed: number;
  phase: number;
  tilt: number;
  data: OrbitObjectData;
}

const BODY_DATA: OrbitObjectData[] = [
  { id: "OBJECT 01", mass: "0.42 M⊕", distance: "0.61 AU", klass: "FERROUS CORE", period: "164 D" },
  { id: "OBJECT 02", mass: "2.17 M⊕", distance: "0.94 AU", klass: "SUPER-EARTH", period: "301 D" },
  { id: "OBJECT 03", mass: "0.08 M⊕", distance: "1.10 AU", klass: "REGOLITH BODY", period: "388 D" },
  { id: "OBJECT 04", mass: "0.81 M⊕", distance: "1.27 AU", klass: "TERRESTRIAL", period: "517 D" },
  { id: "OBJECT 05", mass: "11.6 M⊕", distance: "2.05 AU", klass: "ICE GIANT", period: "1,062 D" },
  { id: "OBJECT 06", mass: "0.02 M⊕", distance: "2.61 AU", klass: "CAPTURED FRAGMENT", period: "1,540 D" },
];

function makeStarTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

function makeGlowTexture(inner: string, outer: string): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, outer);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function makeMoonTexture(): { map: THREE.Texture; bump: THREE.Texture } {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#191b20";
  ctx.fillRect(0, 0, size, size);
  // fine regolith noise
  for (let i = 0; i < 9000; i++) {
    const v = 20 + Math.random() * 26;
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.4, 1.4);
  }
  // craters
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 2 + Math.random() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(8,9,12,0.55)");
    g.addColorStop(0.75, "rgba(10,11,14,0.28)");
    g.addColorStop(0.92, "rgba(58,62,72,0.32)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const map = new THREE.CanvasTexture(c);
  const bump = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, bump };
}

export class NocturneScene {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private quality!: SceneQuality;
  private reduced = false;

  private starMat!: THREE.PointsMaterial;
  private nebulaMat!: THREE.PointsMaterial;
  private deepMat!: THREE.ShaderMaterial;
  private moonGroup!: THREE.Group;
  private moonMesh!: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  private moonRings: THREE.Line[] = [];
  private signalGroup!: THREE.Group;
  private waveLine!: THREE.Line;
  private wavePositions!: Float32Array;
  private waveBase!: Float32Array;
  private orbitGroup!: THREE.Group;
  private bodies: OrbitBody[] = [];
  private finalGroup!: THREE.Group;
  private finalGlow!: THREE.Sprite;
  private finalCore!: THREE.Mesh;

  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private pointerDirty = false;
  private timescale = 1;
  private elapsed = 0;
  private hoverCallback: (data: OrbitObjectData | null) => void = () => {};
  private rafId = 0;
  private disposed = false;
  private velocities: number[] = [];

  get webglAvailable() {
    return true;
  }

  init(
    container: HTMLElement,
    quality: SceneQuality,
    reduced: boolean,
    onHoverBody: (data: OrbitObjectData | null) => void
  ): void {
    this.quality = quality;
    this.reduced = reduced;
    this.hoverCallback = onHoverBody;

    this.renderer = new THREE.WebGLRenderer({
      antialias: quality.pixelRatio <= 1.5,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(quality.pixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x050507, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050507, 0.0075);

    this.camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      900
    );
    this.camera.position.set(0, 0, 8);

    const starTex = makeStarTexture();

    // ---- Star field: one deep shell spanning the whole descent ----
    const starCount = quality.stars;
    const sPos = new Float32Array(starCount * 3);
    const sCol = new Float32Array(starCount * 3);
    const tint = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      sPos[i * 3] = (Math.random() - 0.5) * 640;
      sPos[i * 3 + 1] = (Math.random() - 0.5) * 420;
      sPos[i * 3 + 2] = 40 - Math.random() * 620;
      const b = 0.25 + Math.pow(Math.random(), 2.4) * 0.75;
      tint.setHSL(Math.random() < 0.82 ? 0.6 + Math.random() * 0.08 : 0.08, 0.12 + Math.random() * 0.2, b * 0.82);
      sCol[i * 3] = tint.r;
      sCol[i * 3 + 1] = tint.g;
      sCol[i * 3 + 2] = tint.b;
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
    this.starMat = new THREE.PointsMaterial({
      size: 1.15,
      map: starTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(sGeo, this.starMat);
    this.scene.add(stars);

    // ---- Nebula dust ----
    const nCount = quality.nebula;
    const nPos = new Float32Array(nCount * 3);
    const nCol = new Float32Array(nCount * 3);
    for (let i = 0; i < nCount; i++) {
      nPos[i * 3] = (Math.random() - 0.5) * 420;
      nPos[i * 3 + 1] = (Math.random() - 0.5) * 260;
      nPos[i * 3 + 2] = -60 - Math.random() * 340;
      const warm = Math.random() < 0.3;
      tint.setRGB(
        warm ? 0.32 : 0.1 + Math.random() * 0.08,
        warm ? 0.24 : 0.12 + Math.random() * 0.08,
        warm ? 0.18 : 0.2 + Math.random() * 0.12
      );
      nCol[i * 3] = tint.r;
      nCol[i * 3 + 1] = tint.g;
      nCol[i * 3 + 2] = tint.b;
    }
    const nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute("position", new THREE.BufferAttribute(nPos, 3));
    nGeo.setAttribute("color", new THREE.BufferAttribute(nCol, 3));
    this.nebulaMat = new THREE.PointsMaterial({
      size: 34,
      map: starTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.scene.add(new THREE.Points(nGeo, this.nebulaMat));

    // ---- Chapter 01: the moon ----
    this.moonGroup = new THREE.Group();
    this.moonGroup.position.set(6.5, 1.2, -75);
    const { map, bump } = makeMoonTexture();
    const moonGeo = new THREE.SphereGeometry(7, quality.moonSegments, quality.moonSegments);
    const moonMat = new THREE.MeshStandardMaterial({
      map,
      bumpMap: bump,
      bumpScale: 0.35,
      roughness: 0.96,
      metalness: 0.02,
      color: 0x9aa0ab,
    });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonGroup.add(this.moonMesh);

    const sun = new THREE.DirectionalLight(0xe6ecf6, 5.2);
    // DirectionalLight.target defaults to the world origin — point both
    // light and target at the moon explicitly or the lit hemisphere faces away.
    sun.position.set(-17.5, 11, -57);
    sun.target.position.set(6.5, 1.2, -75);
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.moonGroup.add(new THREE.AmbientLight(0x343946, 2.6));
    const rim = new THREE.DirectionalLight(0x2c3350, 2.2);
    rim.position.set(21, -5, -84);
    rim.target.position.set(6.5, 1.2, -75);
    this.scene.add(rim);
    this.scene.add(rim.target);

    // survey rings around the moon
    for (let i = 0; i < 3; i++) {
      const r = 10.5 + i * 3.2;
      const curve = new THREE.EllipseCurve(0, 0, r, r, 0, Math.PI * 2);
      const pts = curve.getPoints(128);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.LineLoop(
        geo,
        new THREE.LineBasicMaterial({ color: 0x8b93a4, transparent: true, opacity: 0.14 - i * 0.035 })
      );
      line.rotation.x = Math.PI / 2.25 + i * 0.12;
      line.rotation.y = i * 0.5;
      this.moonRings.push(line);
      this.moonGroup.add(line);
    }
    this.scene.add(this.moonGroup);

    // ---- Chapter 02: the signal ----
    this.signalGroup = new THREE.Group();
    this.signalGroup.position.set(-3, 0, -148);
    // calibration grid — thin horizontal reference lines
    const gridMat = new THREE.LineBasicMaterial({ color: 0x5a6272, transparent: true, opacity: 0.12 });
    for (let i = 0; i <= 12; i++) {
      const y = -7 + i * 1.2;
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-16, y, 0),
        new THREE.Vector3(16, y, 0),
      ]);
      this.signalGroup.add(new THREE.Line(g, gridMat));
    }
    for (let i = 0; i <= 16; i++) {
      const x = -16 + i * 2;
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, -7, 0),
        new THREE.Vector3(x, 7.2, 0),
      ]);
      this.signalGroup.add(new THREE.Line(g, gridMat));
    }
    // waveform
    const N = 256;
    this.wavePositions = new Float32Array(N * 3);
    this.waveBase = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      this.wavePositions[i * 3] = -16 + (i / (N - 1)) * 32;
      this.wavePositions[i * 3 + 2] = 0.4;
    }
    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute("position", new THREE.BufferAttribute(this.wavePositions, 3));
    this.waveLine = new THREE.Line(
      wGeo,
      new THREE.LineBasicMaterial({ color: 0xb9c6d6, transparent: true, opacity: 0.9 })
    );
    this.signalGroup.add(this.waveLine);
    // secondary echo wave
    const echoPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) echoPos[i * 3] = this.wavePositions[i * 3];
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute("position", new THREE.BufferAttribute(echoPos, 3));
    const echo = new THREE.Line(
      eGeo,
      new THREE.LineBasicMaterial({ color: 0x64708a, transparent: true, opacity: 0.35 })
    );
    echo.name = "echo";
    this.signalGroup.add(echo);
    // source marker
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xd8dee9 })
    );
    marker.position.set(0, 0, 0.4);
    this.signalGroup.add(marker);
    this.scene.add(this.signalGroup);

    // ---- Chapter 03: the orbit system ----
    this.orbitGroup = new THREE.Group();
    this.orbitGroup.position.set(0, 0, -233);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 48, 48),
      new THREE.MeshStandardMaterial({
        color: 0x2a2e3a,
        roughness: 0.5,
        metalness: 0.35,
        emissive: 0x0c0e14,
      })
    );
    this.orbitGroup.add(core);
    const coreLight = new THREE.PointLight(0xcfd6e4, 320, 70, 1.7);
    coreLight.position.set(-9, 6, 7);
    this.orbitGroup.add(coreLight);
    this.orbitGroup.add(new THREE.AmbientLight(0x3a3f4c, 2.0));
    const rimLight = new THREE.DirectionalLight(0x4a5470, 1.6);
    rimLight.position.set(10, -4, -8);
    this.orbitGroup.add(rimLight);

    const orbitSpecs = [
      { r: 6.5, tiltX: 0.42, tiltZ: 0.1 },
      { r: 9.2, tiltX: -0.3, tiltZ: -0.22 },
      { r: 12.4, tiltX: 0.16, tiltZ: 0.34 },
    ];
    for (const spec of orbitSpecs) {
      const curve = new THREE.EllipseCurve(0, 0, spec.r, spec.r, 0, Math.PI * 2);
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(160));
      const ring = new THREE.LineLoop(
        geo,
        new THREE.LineBasicMaterial({ color: 0x7c8496, transparent: true, opacity: 0.2 })
      );
      ring.rotation.x = Math.PI / 2 + spec.tiltX;
      ring.rotation.y = spec.tiltZ;
      this.orbitGroup.add(ring);
    }
    const bodyGeo = new THREE.SphereGeometry(1, 20, 20);
    for (let i = 0; i < quality.orbitBodies; i++) {
      const radius = [6.5, 9.2, 12.4][i % 3] + (i > 2 ? 1.4 : 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xd4dae6,
        roughness: 0.6,
        metalness: 0.15,
        emissive: 0x14161c,
        transparent: true,
      });
      const mesh = new THREE.Mesh(bodyGeo, mat);
      const size = 0.3 + Math.random() * 0.3;
      mesh.scale.setScalar(size);
      const orbit = {
        mesh,
        radius,
        speed: (0.14 + Math.random() * 0.4) * (i % 2 === 0 ? 1 : -1) * (3.2 / radius),
        phase: Math.random() * Math.PI * 2,
        tilt: Math.PI / 2 + [0.42, -0.3, 0.16][i % 3] + (i > 2 ? 0.5 : 0),
        data: BODY_DATA[i],
      };
      this.bodies.push(orbit);
      this.orbitGroup.add(mesh);
    }
    this.velocities = this.bodies.map(() => 0);
    this.scene.add(this.orbitGroup);

    // ---- Chapter 04: the deep field ----
    const dCount = quality.deep;
    const dPos = new Float32Array(dCount * 3);
    const dSize = new Float32Array(dCount);
    const dSeed = new Float32Array(dCount);
    for (let i = 0; i < dCount; i++) {
      dPos[i * 3] = (Math.random() - 0.5) * 480;
      dPos[i * 3 + 1] = (Math.random() - 0.5) * 320;
      dPos[i * 3 + 2] = -260 - Math.random() * 180;
      dSize[i] = 0.6 + Math.pow(Math.random(), 3) * 4.4;
      dSeed[i] = Math.random() * 100;
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    dGeo.setAttribute("aSize", new THREE.BufferAttribute(dSize, 1));
    dGeo.setAttribute("aSeed", new THREE.BufferAttribute(dSeed, 1));
    this.deepMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: quality.pixelRatio },
        uOpacity: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aSeed;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vTwinkle;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * 0.05 + aSeed) * 1.6;
          p.y += cos(uTime * 0.04 + aSeed * 1.7) * 1.2;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float tw = 0.65 + 0.35 * sin(uTime * (0.4 + fract(aSeed) * 0.8) + aSeed * 6.0);
          vTwinkle = tw;
          gl_PointSize = aSize * uPixelRatio * tw * (140.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vTwinkle;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float a = smoothstep(0.5, 0.0, d);
          a = pow(a, 1.8);
          gl_FragColor = vec4(vec3(0.82, 0.86, 0.94), a * vTwinkle * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.scene.add(new THREE.Points(dGeo, this.deepMat));

    // ---- Chapter 05: the single light ----
    this.finalGroup = new THREE.Group();
    this.finalGroup.position.set(0, 0.5, -470);
    this.finalCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.finalGroup.add(this.finalCore);
    this.finalGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture("rgba(255,255,255,0.9)", "rgba(160,180,220,0.25)"),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.finalGlow.scale.setScalar(9);
    this.finalGroup.add(this.finalGlow);
    this.scene.add(this.finalGroup);

    window.addEventListener("resize", this.onResize);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    this.loop();
  }

  private onResize = () => {
    if (this.disposed) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onPointerMove = (e: PointerEvent) => {
    this.pointerNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    this.pointerDirty = true;
  };

  private updateWave(offset: number, amp: number, freq: number, speed: number) {
    const N = this.waveBase.length;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const carrier =
        Math.sin(t * freq + this.elapsed * speed) * 0.5 +
        Math.sin(t * freq * 2.7 + this.elapsed * speed * 1.7) * 0.3 +
        Math.sin(t * freq * 0.31 + this.elapsed * speed * 0.4) * 0.4;
      const burst = Math.exp(-Math.pow((t - (0.5 + Math.sin(this.elapsed * 0.23) * 0.3)) * 5, 2)) * 0.9;
      this.waveBase[i] = carrier * (amp + burst);
      this.wavePositions[offset === 0 ? i * 3 : i * 3] = -16 + t * 32;
    }
    for (let i = 0; i < N; i++) {
      this.wavePositions[i * 3 + 1] = this.waveBase[i];
    }
    (this.waveLine.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateEcho(amp: number) {
    const echo = this.signalGroup.getObjectByName("echo") as THREE.Line | undefined;
    if (!echo) return;
    const attr = echo.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const N = this.waveBase.length;
    const lag = 0.55;
    for (let i = 0; i < N; i++) {
      const j = Math.max(0, i - 8);
      arr[i * 3] = -16 + (i / (N - 1)) * 32;
      arr[i * 3 + 1] = this.waveBase[j] * lag * 0.7 + Math.sin(i * 0.35 + this.elapsed * 1.4) * 0.06 * amp;
    }
    attr.needsUpdate = true;
  }

  private handleHover() {
    if (!this.pointerDirty) return;
    this.pointerDirty = false;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const meshes = this.bodies.map((b) => b.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    const hit = hits.length ? hits[0].object : null;
    const prev = this.bodies.find((b) => b.mesh.scale.x > 0.4);
    if (hit) {
      const body = this.bodies.find((b) => b.mesh === hit)!;
      if (!prev || prev.mesh !== hit) {
        this.hoverCallback(body.data);
      }
    } else if (prev) {
      this.hoverCallback(null);
    }
  }

  private loop = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt * this.timescale;

    const p = scrollState.progress;
    const motion = this.reduced ? 0 : 1;

    // ---- hover handling (only meaningful near the orbit chapter) ----
    if (p > 0.36 && p < 0.64) {
      this.handleHover();
      const hovered = scrollState.hovered !== null;
      this.timescale += ((hovered ? 0.12 : 1) - this.timescale) * Math.min(1, dt * 5);
    } else {
      this.timescale += (1 - this.timescale) * Math.min(1, dt * 3);
      if (scrollState.hovered !== null && p < 0.34) this.hoverCallback(null);
    }

    // ---- camera descent ----
    const driftX = Math.sin(p * Math.PI * 3.1) * 2.4 * motion;
    const driftY = Math.cos(p * Math.PI * 2.2) * 1.1 * motion;
    const px = scrollState.pointerX * 0.9 * motion;
    const py = scrollState.pointerY * 0.5 * motion;
    this.camera.position.x += (driftX + px - this.camera.position.x) * Math.min(1, dt * 2.2);
    this.camera.position.y += (driftY + py - this.camera.position.y) * Math.min(1, dt * 2.2);
    this.camera.position.z = 8 - p * 438;
    const look = new THREE.Vector3(this.camera.position.x * 0.4 + px * 1.5, py * 0.8, this.camera.position.z - 30);
    this.camera.lookAt(look);
    this.camera.rotation.z = Math.sin(p * Math.PI * 2) * 0.03 * motion;

    // ---- chapter-specific animation ----
    // moon: slow rotation, visible near p ~ 0.02..0.24
    this.moonMesh.rotation.y += dt * 0.02 * this.timescale;
    for (const ring of this.moonRings) ring.rotation.z += dt * 0.03;
    const moonFade = THREE.MathUtils.clamp(1 - Math.abs(p - 0.13) / 0.16, 0, 1);
    this.moonGroup.visible = moonFade > 0.01;

    // signal: waveform reacts to scroll velocity and pointer
    const nearSignal = Math.abs(p - 0.31) < 0.16;
    this.signalGroup.visible = nearSignal;
    if (nearSignal) {
      const amp =
        1.1 +
        Math.min(2.6, Math.abs(scrollState.velocity) * 22) +
        Math.abs(scrollState.pointerX) * 0.8 * motion;
      const freq = 14 + scrollState.pointerX * 6 * motion;
      this.updateWave(0, amp, freq, 2.2);
      this.updateEcho(amp);
    }

    // orbit bodies
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      b.phase += dt * b.speed * this.timescale;
      const x = Math.cos(b.phase) * b.radius;
      const z = Math.sin(b.phase) * b.radius;
      b.mesh.position.set(x, 0, z);
      b.mesh.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), b.tilt - Math.PI / 2);
      const isHovered = scrollState.hovered?.id === b.data.id;
      const base = (b.mesh.userData.baseScale as number) ?? (b.mesh.userData.baseScale = b.mesh.scale.x);
      const s = (isHovered ? 1.8 : 1) * base;
      b.mesh.scale.x += (s - b.mesh.scale.x) * Math.min(1, dt * 8);
      b.mesh.scale.y = b.mesh.scale.x;
      b.mesh.scale.z = b.mesh.scale.x;
      (b.mesh.material as THREE.MeshStandardMaterial).emissive?.setScalar?.(isHovered ? 0.25 : 0);
    }

    // deep field
    this.deepMat.uniforms.uTime.value = this.elapsed;

    // the final light
    const pulse = 1 + Math.sin(this.elapsed * 0.8) * 0.12;
    this.finalGlow.scale.setScalar(9 * pulse);
    (this.finalCore.material as THREE.MeshBasicMaterial).color.setScalar(0.85 + Math.sin(this.elapsed * 0.8) * 0.15);

    // global fades: stars drain away as we reach the unknown
    const dark = THREE.MathUtils.smoothstep(p, 0.8, 0.94);
    this.starMat.opacity = 0.9 * (1 - dark * 0.85);
    this.nebulaMat.opacity = 0.1 * (1 - dark);
    this.deepMat.uniforms.uOpacity.value = 1 - THREE.MathUtils.smoothstep(p, 0.78, 0.9);

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("pointermove", this.onPointerMove);
    this.scene?.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }
}
