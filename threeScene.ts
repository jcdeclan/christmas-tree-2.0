import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SceneMode } from './types';

class Particle {
  mesh: THREE.Group | THREE.Mesh;
  type: string;
  targetPos: THREE.Vector3 = new THREE.Vector3();
  targetRot: THREE.Euler = new THREE.Euler();
  velocity: THREE.Vector3 = new THREE.Vector3(
    (Math.random() - 0.5) * 0.15,
    (Math.random() - 0.5) * 0.15,
    (Math.random() - 0.5) * 0.15
  );
  originIndex: number;

  constructor(mesh: THREE.Group | THREE.Mesh, type: string, index: number) {
    this.mesh = mesh;
    this.type = type;
    this.originIndex = index;
  }

  update(mode: SceneMode, focusTarget: number | null) {
    // Smoother interpolation for positions
    const lerpSpeed = mode === SceneMode.FOCUS ? 0.04 : 0.08;
    this.mesh.position.lerp(this.targetPos, lerpSpeed);
    
    if (mode === SceneMode.SCATTER) {
        // Individual rotation based on velocity vector
        this.mesh.rotation.x += this.velocity.x * 2.5;
        this.mesh.rotation.y += this.velocity.y * 2.5;
        this.mesh.rotation.z += this.velocity.z * 2.5;
    } else if (mode === SceneMode.FOCUS && focusTarget !== this.originIndex) {
        // Subtle drift for non-focused items
        this.mesh.position.addScaledVector(this.velocity, 0.05);
        this.mesh.rotation.x += this.velocity.x * 0.2;
        this.mesh.rotation.y += this.velocity.y * 0.2;
    } else {
        // Align to target rotation
        this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, this.targetRot.x, 0.06);
        this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, this.targetRot.y, 0.06);
        this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, this.targetRot.z, 0.06);
    }
  }
}

export class ChristmasScene {
  container: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  particles: Particle[] = [];
  dust: THREE.Points;
  mainGroup: THREE.Group;
  mode: SceneMode = SceneMode.TREE;
  focusTargetIdx: number | null = null;
  
  private clock = new THREE.Clock();

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);

    // Renderer Setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 2.2;
    container.appendChild(this.renderer.domElement);

    // Camera Setup
    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 2, 50);

    // Environment Lighting
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(this.renderer), 0.04).texture;

    // Post-Processing Pipeline
    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.45, // strength
      0.4,  // radius
      0.7   // threshold
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    this.initLights();
    this.initParticles();
    this.initDust();
    this.initPhotoWall();

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    
    const orangePoint = new THREE.PointLight(0xffaa44, 2.5, 60);
    orangePoint.position.set(0, 5, 5);
    this.scene.add(orangePoint);

    const goldSpot = new THREE.SpotLight(0xd4af37, 1200);
    goldSpot.position.set(30, 40, 40);
    goldSpot.angle = 0.4;
    goldSpot.penumbra = 0.2;
    this.scene.add(goldSpot);

    const blueSpot = new THREE.SpotLight(0x5599ff, 600);
    blueSpot.position.set(-30, 20, -30);
    blueSpot.angle = 0.5;
    this.scene.add(blueSpot);
  }

  private createCandyCaneTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#d40000';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = -128; i < 256; i += 32) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 128, 128);
    }
    ctx.stroke();
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 1);
    return texture;
  }

  private initParticles() {
    const goldMat = new THREE.MeshStandardMaterial({ 
      color: 0xd4af37, 
      metalness: 0.95, 
      roughness: 0.15,
      emissive: 0x442200,
      emissiveIntensity: 0.1
    });
    const greenMat = new THREE.MeshStandardMaterial({ 
      color: 0x0a3d0a, 
      metalness: 0.4, 
      roughness: 0.7 
    });
    const redMat = new THREE.MeshPhysicalMaterial({ 
      color: 0xee0000, 
      metalness: 0.1, 
      roughness: 0.05, 
      clearcoat: 1.0, 
      clearcoatRoughness: 0.05 
    });
    
    const candyCaneTexture = this.createCandyCaneTexture();
    const candyMat = new THREE.MeshStandardMaterial({ map: candyCaneTexture });

    const totalCount = 1500;
    for (let i = 0; i < totalCount; i++) {
      let mesh: THREE.Group | THREE.Mesh;
      let type: string;

      const rnd = Math.random();
      if (rnd < 0.45) {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), Math.random() > 0.4 ? greenMat : goldMat);
        type = 'BOX';
      } else if (rnd < 0.85) {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), Math.random() > 0.5 ? goldMat : redMat);
        type = 'SPHERE';
      } else {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0.8, 0),
          new THREE.Vector3(0.2, 1.0, 0),
          new THREE.Vector3(0.4, 0.8, 0),
        ]);
        const geometry = new THREE.TubeGeometry(curve, 12, 0.1, 8, false);
        mesh = new THREE.Mesh(geometry, candyMat);
        type = 'CANDY';
      }

      const p = new Particle(mesh, type, i);
      this.particles.push(p);
      this.mainGroup.add(mesh);
    }
    this.setMode(SceneMode.TREE);
  }

  private initDust() {
    const geometry = new THREE.BufferGeometry();
    const count = 2500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xfceea7, size: 0.1, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
    this.dust = new THREE.Points(geometry, material);
    this.scene.add(this.dust);
  }

  private initPhotoWall() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 50px Cinzel';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JOYEUX NOËL', 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.addPhotoToScene(texture);
  }

  public addPhotoToScene(texture: THREE.Texture) {
    const group = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({ 
      color: 0xd4af37, 
      metalness: 0.9, 
      roughness: 0.1,
      emissive: 0x221100,
      emissiveIntensity: 0.2
    });
    const photoMat = new THREE.MeshBasicMaterial({ map: texture });

    // Gold Frame as specified
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 0.2), goldMat);
    group.add(frame);

    const photo = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.8), photoMat);
    photo.position.z = 0.11;
    group.add(photo);

    const p = new Particle(group, 'PHOTO', this.particles.length);
    this.particles.push(p);
    this.mainGroup.add(group);
    
    // Auto-update positions based on current mode
    this.setMode(this.mode);
  }

  public setMode(mode: SceneMode) {
    this.mode = mode;
    
    if (mode === SceneMode.FOCUS) {
      const photos = this.particles.filter(p => p.type === 'PHOTO');
      if (photos.length > 0) {
        const target = photos[Math.floor(Math.random() * photos.length)];
        this.focusTargetIdx = target.originIndex;
      }
    } else {
      this.focusTargetIdx = null;
    }

    this.particles.forEach((p, i) => {
      if (mode === SceneMode.TREE) {
        // Conical Spiral Algorithm as specified
        const t = (i / this.particles.length);
        const maxRadius = 14;
        const radius = maxRadius * (1 - t);
        const angle = t * 45 * Math.PI;
        p.targetPos.set(
          Math.cos(angle) * radius,
          t * 26 - 12,
          Math.sin(angle) * radius
        );
        p.targetRot.set(0, angle, 0);
        p.mesh.scale.set(1, 1, 1);
      } else if (mode === SceneMode.SCATTER) {
        // Sphere distribution 8 to 20 radius
        const radius = 8 + Math.random() * 14;
        const phi = Math.acos(-1 + (2 * i) / this.particles.length);
        const theta = Math.sqrt(this.particles.length * Math.PI) * phi;
        p.targetPos.set(
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.sin(theta) * Math.sin(phi),
          radius * Math.cos(phi)
        );
        p.mesh.scale.set(1, 1, 1);
      } else if (mode === SceneMode.FOCUS) {
        if (i === this.focusTargetIdx) {
          // Focus target position as specified
          p.targetPos.set(0, 2, 35);
          p.targetRot.set(0, 0, 0);
          p.mesh.scale.set(4.5, 4.5, 4.5);
        } else {
          // Others scatter to the background
          const angle = Math.random() * Math.PI * 2;
          const dist = 30 + Math.random() * 15;
          p.targetPos.set(Math.cos(angle) * dist, Math.sin(angle) * dist, -15);
          p.mesh.scale.set(0.4, 0.4, 0.4);
        }
      }
    });
  }

  public updateInteraction(palmCenter: { x: number, y: number } | null) {
    if (palmCenter) {
      // Landmark mapping to container rotation
      const targetRX = (palmCenter.y - 0.5) * -0.6;
      const targetRY = (palmCenter.x - 0.5) * 0.9;
      this.mainGroup.rotation.x = THREE.MathUtils.lerp(this.mainGroup.rotation.x, targetRX, 0.08);
      this.mainGroup.rotation.y = THREE.MathUtils.lerp(this.mainGroup.rotation.y, targetRY, 0.08);
    }
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.particles.forEach(p => p.update(this.mode, this.focusTargetIdx));
    
    // Ambient dust movement
    if (this.dust) {
      this.dust.rotation.y += delta * 0.02;
      this.dust.position.y = Math.sin(time * 0.4) * 0.8;
      this.dust.position.x = Math.cos(time * 0.3) * 0.8;
    }

    this.composer.render();
  };

  private onResize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  };

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}