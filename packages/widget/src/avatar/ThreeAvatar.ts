import * as THREE from 'three';
import type { Gesture } from '@pitchcat/shared';
import type { Avatar, AvatarState } from './Avatar';

/**
 * ThreeAvatar renders a stylized 3D mascot ("Dot" - cat in a tailored suit).
 * Features:
 * - 3D PBR materials with soft key, fill, and rim lighting
 * - Smooth 3D head turning & eye gaze tracking towards cursor
 * - Realistic 3D jaw articulation for lip-sync driven by audio amplitude
 * - Procedural 3D gestures: wave, point, nod, shrug, thumbsup
 * - Breathing idle loops and randomized blinking
 * - Highly optimized and compact footprint
 */
export class ThreeAvatar implements Avatar {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animId: number | null = null;

  // 3D Model hierarchy
  private rootGroup = new THREE.Group();
  private bodyGroup = new THREE.Group();
  private headGroup = new THREE.Group();
  private jawGroup = new THREE.Group();
  private leftArm = new THREE.Group();
  private rightArm = new THREE.Group();
  private leftEye = new THREE.Group();
  private rightEye = new THREE.Group();
  private leftEyelid: THREE.Mesh | null = null;
  private rightEyelid: THREE.Mesh | null = null;

  // State variables
  private state: AvatarState = 'idle';
  private mouthTarget = 0;
  private mouthCurrent = 0;
  private targetLook = new THREE.Vector2(0, 0);
  private currentLook = new THREE.Vector2(0, 0);
  private reducedMotion = false;

  // Animation timers
  private blinkTimer: number | null = null;
  private isBlinking = false;
  private activeGesture: Gesture | null = null;
  private gestureStartTime = 0;
  private clock = new THREE.Clock();

  mount(container: HTMLElement): void {
    this.container = container;

    const width = 100;
    const height = 120;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 50);
    this.camera.position.set(0, 0.4, 4.3);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.canvas = this.renderer.domElement;
    this.canvas.style.display = 'block';
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.style.filter = 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25))';
    this.canvas.style.pointerEvents = 'none';

    this.container.appendChild(this.canvas);

    // 3. Lighting
    this.setupLighting();

    // 4. Construct 3D Character
    this.buildMascot();

    // 5. Start loops
    this.startBlinkLoop();
    this.animate();
  }

  destroy(): void {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.blinkTimer) {
      clearTimeout(this.blinkTimer);
      this.blinkTimer = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.container = null;
  }

  setState(state: AvatarState): void {
    this.state = state;
    if (state === 'thinking') {
      this.setMouth(0);
    }
  }

  setMouth(value: number): void {
    this.mouthTarget = Math.max(0, Math.min(1, value));
  }

  triggerGesture(gesture: Gesture): void {
    if (this.reducedMotion) return;
    this.activeGesture = gesture;
    this.gestureStartTime = this.clock.getElapsedTime();
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  setCursorPosition(x: number, y: number): void {
    // Map normalized (0..1) to (-1..1) for 3D look-at
    this.targetLook.x = (x - 0.5) * 2;
    this.targetLook.y = -(y - 0.5) * 1.5;
  }

  private setupLighting(): void {
    if (!this.scene) return;

    // Ambient fill
    const ambient = new THREE.AmbientLight(0xdbeafe, 1.2);
    this.scene.add(ambient);

    // Main key light (warm direct sun)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(2, 4, 3);
    this.scene.add(keyLight);

    // Subtle emerald rim light from behind (matches CarbonDot brand)
    const rimLight = new THREE.DirectionalLight(0x00c48c, 2.2);
    rimLight.position.set(-3, 2, -2);
    this.scene.add(rimLight);

    // Front soft fill
    const fillLight = new THREE.PointLight(0xa7f3d0, 0.8, 10);
    fillLight.position.set(0, 0, 2);
    this.scene.add(fillLight);
  }

  private buildMascot(): void {
    if (!this.scene) return;

    // ── Materials ──
    const furMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155, // Sleek slate grey fur
      roughness: 0.65,
      metalness: 0.05,
    });

    const innerEarMaterial = new THREE.MeshStandardMaterial({
      color: 0xfda4af, // Soft pink inner ear
      roughness: 0.5,
    });

    const suitMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Deep midnight navy business suit
      roughness: 0.8,
      metalness: 0.1,
    });

    const lapelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
    });

    const shirtMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Crisp white shirt
      roughness: 0.4,
    });

    const tieMaterial = new THREE.MeshStandardMaterial({
      color: 0x00c48c, // Emerald green tie
      roughness: 0.3,
      metalness: 0.2,
    });

    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
    });

    const irisMaterial = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Vibrant emerald eyes
      roughness: 0.2,
    });

    const pupilMaterial = new THREE.MeshBasicMaterial({
      color: 0x090d16,
    });

    const mouthInsideMaterial = new THREE.MeshBasicMaterial({
      color: 0xb91c1c, // Crimson inside mouth
    });

    // ── Torso & Suit ──
    const torsoGeo = new THREE.CylinderGeometry(0.38, 0.46, 0.95, 20);
    const torso = new THREE.Mesh(torsoGeo, suitMaterial);
    torso.position.y = -0.38;
    this.bodyGroup.add(torso);

    // Shirt collar
    const shirtGeo = new THREE.ConeGeometry(0.24, 0.35, 4);
    shirtGeo.rotateY(Math.PI / 4);
    const shirt = new THREE.Mesh(shirtGeo, shirtMaterial);
    shirt.position.set(0, -0.05, 0.32);
    shirt.rotation.x = 0.25;
    this.bodyGroup.add(shirt);

    // Lapels
    const leftLapel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.05), lapelMaterial);
    leftLapel.position.set(-0.16, -0.15, 0.34);
    leftLapel.rotation.z = -0.35;
    this.bodyGroup.add(leftLapel);

    const rightLapel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.05), lapelMaterial);
    rightLapel.position.set(0.16, -0.15, 0.34);
    rightLapel.rotation.z = 0.35;
    this.bodyGroup.add(rightLapel);

    // Tie
    const tieGeo = new THREE.BoxGeometry(0.08, 0.42, 0.04);
    const tie = new THREE.Mesh(tieGeo, tieMaterial);
    tie.position.set(0, -0.22, 0.37);
    tie.rotation.x = 0.15;
    this.bodyGroup.add(tie);

    // Left Arm
    this.leftArm.position.set(-0.46, -0.08, 0);
    const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.55, 12), suitMaterial);
    leftSleeve.position.y = -0.25;
    this.leftArm.add(leftSleeve);
    const leftPaw = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), furMaterial);
    leftPaw.position.y = -0.55;
    this.leftArm.add(leftPaw);
    this.bodyGroup.add(this.leftArm);

    // Right Arm
    this.rightArm.position.set(0.46, -0.08, 0);
    const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.55, 12), suitMaterial);
    rightSleeve.position.y = -0.25;
    this.rightArm.add(rightSleeve);
    const rightPaw = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), furMaterial);
    rightPaw.position.y = -0.55;
    this.rightArm.add(rightPaw);
    this.bodyGroup.add(this.rightArm);

    // ── Head ──
    this.headGroup.position.set(0, 0.4, 0);

    // Main head sphere
    const headGeo = new THREE.SphereGeometry(0.45, 24, 24);
    headGeo.scale(1.15, 0.95, 1.0);
    const head = new THREE.Mesh(headGeo, furMaterial);
    this.headGroup.add(head);

    // Snout / muzzle
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), furMaterial);
    muzzle.scale.set(1.4, 0.75, 1.0);
    muzzle.position.set(0, -0.12, 0.35);
    this.headGroup.add(muzzle);

    // Nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.05, 3), innerEarMaterial);
    nose.rotation.z = Math.PI;
    nose.position.set(0, -0.06, 0.47);
    this.headGroup.add(nose);

    // Whiskers (3 left, 3 right)
    const whiskerMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    for (let i = -1; i <= 1; i++) {
      // Left whiskers
      const lwGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.15, -0.1 + i * 0.04, 0.42),
        new THREE.Vector3(-0.55, -0.08 + i * 0.07, 0.35),
      ]);
      this.headGroup.add(new THREE.Line(lwGeo, whiskerMat));

      // Right whiskers
      const rwGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0.15, -0.1 + i * 0.04, 0.42),
        new THREE.Vector3(0.55, -0.08 + i * 0.07, 0.35),
      ]);
      this.headGroup.add(new THREE.Line(rwGeo, whiskerMat));
    }

    // Ears
    const earGeo = new THREE.ConeGeometry(0.2, 0.36, 4);
    earGeo.scale(1.1, 1.0, 0.45);

    const leftEar = new THREE.Mesh(earGeo, furMaterial);
    leftEar.position.set(-0.32, 0.42, 0);
    leftEar.rotation.set(-0.1, 0, 0.35);
    this.headGroup.add(leftEar);

    const leftInnerEar = new THREE.Mesh(earGeo, innerEarMaterial);
    leftInnerEar.scale.set(0.65, 0.65, 0.65);
    leftInnerEar.position.set(-0.31, 0.4, 0.05);
    leftInnerEar.rotation.set(-0.1, 0, 0.35);
    this.headGroup.add(leftInnerEar);

    const rightEar = new THREE.Mesh(earGeo, furMaterial);
    rightEar.position.set(0.32, 0.42, 0);
    rightEar.rotation.set(-0.1, 0, -0.35);
    this.headGroup.add(rightEar);

    const rightInnerEar = new THREE.Mesh(earGeo, innerEarMaterial);
    rightInnerEar.scale.set(0.65, 0.65, 0.65);
    rightInnerEar.position.set(0.31, 0.4, 0.05);
    rightInnerEar.rotation.set(-0.1, 0, -0.35);
    this.headGroup.add(rightInnerEar);

    // ── Eyes ──
    const eyeGeo = new THREE.SphereGeometry(0.11, 16, 16);
    eyeGeo.scale(1, 1.25, 0.5);

    // Left Eye
    this.leftEye.position.set(-0.2, 0.08, 0.4);
    const leftSclera = new THREE.Mesh(eyeGeo, eyeWhiteMaterial);
    this.leftEye.add(leftSclera);
    const leftIris = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), irisMaterial);
    leftIris.position.set(0, 0, 0.05);
    this.leftEye.add(leftIris);
    const leftPupil = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.09, 8), pupilMaterial);
    leftPupil.position.set(0, 0, 0.09);
    this.leftEye.add(leftPupil);
    this.headGroup.add(this.leftEye);

    // Left Eyelid for blinking
    this.leftEyelid = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), furMaterial);
    this.leftEyelid.position.set(-0.2, 0.08, 0.42);
    this.leftEyelid.rotation.x = -Math.PI / 2;
    this.leftEyelid.scale.set(1, 0.01, 1);
    this.headGroup.add(this.leftEyelid);

    // Right Eye
    this.rightEye.position.set(0.2, 0.08, 0.4);
    const rightSclera = new THREE.Mesh(eyeGeo, eyeWhiteMaterial);
    this.rightEye.add(rightSclera);
    const rightIris = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), irisMaterial);
    rightIris.position.set(0, 0, 0.05);
    this.rightEye.add(rightIris);
    const rightPupil = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.09, 8), pupilMaterial);
    rightPupil.position.set(0, 0, 0.09);
    this.rightEye.add(rightPupil);
    this.headGroup.add(this.rightEye);

    // Right Eyelid for blinking
    this.rightEyelid = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), furMaterial);
    this.rightEyelid.position.set(0.2, 0.08, 0.42);
    this.rightEyelid.rotation.x = -Math.PI / 2;
    this.rightEyelid.scale.set(1, 0.01, 1);
    this.headGroup.add(this.rightEyelid);

    // ── Articulated 3D Jaw / Mouth ──
    this.jawGroup.position.set(0, -0.22, 0.36);
    const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.12), furMaterial);
    this.jawGroup.add(jawMesh);

    // Mouth cavity inside
    const mouthCavity = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.06), mouthInsideMaterial);
    mouthCavity.position.set(0, 0.02, 0.02);
    this.jawGroup.add(mouthCavity);

    this.headGroup.add(this.jawGroup);

    // Assemble root
    this.rootGroup.add(this.bodyGroup);
    this.rootGroup.add(this.headGroup);
    this.rootGroup.position.y = -0.1;
    this.scene.add(this.rootGroup);
  }

  private startBlinkLoop(): void {
    const nextBlink = 2500 + Math.random() * 3500;
    this.blinkTimer = window.setTimeout(() => {
      this.isBlinking = true;
      setTimeout(() => {
        this.isBlinking = false;
        this.startBlinkLoop();
      }, 160);
    }, nextBlink);
  }

  private animate = (): void => {
    this.animId = requestAnimationFrame(this.animate);
    const time = this.clock.getElapsedTime();

    if (!this.reducedMotion) {
      // 1. Idle breathing
      const breath = Math.sin(time * 2.2) * 0.02;
      this.bodyGroup.scale.set(1 + breath, 1 + breath, 1 + breath);
      this.headGroup.position.y = 0.4 + breath * 0.5;

      // 2. Cursor gaze & head tracking
      this.currentLook.lerp(this.targetLook, 0.08);

      // Rotate head slightly toward cursor
      this.headGroup.rotation.y = this.currentLook.x * 0.35;
      this.headGroup.rotation.x = -this.currentLook.y * 0.25;

      // Eyes follow even more
      this.leftEye.rotation.y = this.currentLook.x * 0.2;
      this.leftEye.rotation.x = -this.currentLook.y * 0.2;
      this.rightEye.rotation.y = this.currentLook.x * 0.2;
      this.rightEye.rotation.x = -this.currentLook.y * 0.2;

      // 3. Blinking animation
      const targetEyelidScale = this.isBlinking ? 1.0 : 0.01;
      if (this.leftEyelid && this.rightEyelid) {
        this.leftEyelid.scale.y = THREE.MathUtils.lerp(this.leftEyelid.scale.y, targetEyelidScale, 0.4);
        this.rightEyelid.scale.y = THREE.MathUtils.lerp(this.rightEyelid.scale.y, targetEyelidScale, 0.4);
      }

      // 4. Gestures
      this.updateGestures(time);
    }

    // 5. Mouth / Jaw movement (lip-sync)
    this.mouthCurrent = THREE.MathUtils.lerp(this.mouthCurrent, this.mouthTarget, 0.35);
    this.jawGroup.position.y = -0.22 - this.mouthCurrent * 0.12;
    this.jawGroup.rotation.x = this.mouthCurrent * 0.35;

    // Render
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private updateGestures(time: number): void {
    if (!this.activeGesture) {
      // Default resting arm positions
      this.rightArm.rotation.set(0, 0, 0);
      this.leftArm.rotation.set(0, 0, 0);
      return;
    }

    const elapsed = time - this.gestureStartTime;

    switch (this.activeGesture) {
      case 'wave': {
        if (elapsed > 1.8) {
          this.activeGesture = null;
          return;
        }
        // Raise right arm and wave forearm
        this.rightArm.rotation.z = -1.4;
        this.rightArm.rotation.x = Math.sin(elapsed * 12) * 0.4;
        break;
      }
      case 'point': {
        if (elapsed > 1.8) {
          this.activeGesture = null;
          return;
        }
        // Point right arm forward-left toward the content
        this.rightArm.rotation.z = -0.8;
        this.rightArm.rotation.x = -0.9;
        this.rightArm.rotation.y = -0.4;
        break;
      }
      case 'nod': {
        if (elapsed > 1.4) {
          this.activeGesture = null;
          return;
        }
        // Head bob nod
        this.headGroup.rotation.x += Math.sin(elapsed * 9) * 0.25;
        break;
      }
      case 'shrug': {
        if (elapsed > 1.5) {
          this.activeGesture = null;
          return;
        }
        // Shoulders lift, arms out
        const shrugPhase = Math.sin(elapsed * 2.2);
        this.leftArm.rotation.z = 0.5 * shrugPhase;
        this.rightArm.rotation.z = -0.5 * shrugPhase;
        break;
      }
      case 'thumbsup': {
        if (elapsed > 1.6) {
          this.activeGesture = null;
          return;
        }
        this.leftArm.rotation.z = 1.0;
        this.leftArm.rotation.x = -0.7;
        break;
      }
    }
  }
}
