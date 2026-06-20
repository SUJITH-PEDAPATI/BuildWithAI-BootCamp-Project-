import * as THREE from 'three';
import gsap from 'gsap';
import { properties } from './data.js';

export class Globe3D {
  constructor(containerId, onPinSelect) {
    this.container = document.getElementById(containerId);
    this.onPinSelect = onPinSelect;
    
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    
    this.globeRadius = 140;
    this.pins = [];
    this.isDragging = false;
    this.autoRotate = true;
    
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    
    // Drag rotation variables
    this.targetRotationX = 0.5;
    this.targetRotationY = 0;
    this.mouseOnDownX = 0;
    this.mouseOnDownY = 0;
    this.targetRotationOnMouseDownX = 0;
    this.targetRotationOnMouseDownY = 0;
    
    this.init();
  }
  
  init() {
    // 1. Scene & Camera Setup
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 2000);
    this.camera.position.z = 450;
    
    // 2. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    
    // Clear loader and inject canvas
    const loader = this.container.querySelector('.three-d-loader');
    if (loader) loader.style.display = 'none';
    this.container.appendChild(this.renderer.domElement);
    
    // 3. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.5);
    this.scene.add(ambientLight);
    
    const dirLight1 = new THREE.DirectionalLight(0x17ceb2, 2.5);
    dirLight1.position.set(200, 300, 200);
    this.scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0xf5b927, 1.2);
    dirLight2.position.set(-200, -200, -100);
    this.scene.add(dirLight2);
    
    // 4. Globe Group Creation
    this.globeGroup = new THREE.Group();
    this.scene.add(this.globeGroup);
    
    this.createGlobeSpheres();
    this.createStarfield();
    this.createPins();
    
    // 5. Events Setup
    this.bindEvents();
    
    // 6. Animation Loop
    this.animate();
  }
  
  createGlobeSpheres() {
    // Core Sphere: Obsidian deep blue dark sphere
    const sphereGeo = new THREE.SphereGeometry(this.globeRadius, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x070b19,
      emissive: 0x050c18,
      specular: 0x17ceb2,
      shininess: 30,
      bumpScale: 1,
      transparent: true,
      opacity: 0.95
    });
    this.globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
    this.globeGroup.add(this.globeMesh);
    
    // Grid/Wireframe Hologram Overlay (slightly larger sphere)
    const gridGeo = new THREE.SphereGeometry(this.globeRadius + 1.5, 40, 40);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x17ceb2,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    this.gridMesh = new THREE.Mesh(gridGeo, gridMat);
    this.globeGroup.add(this.gridMesh);

    // Glowing atmosphere ring
    const atmosphereGeo = new THREE.SphereGeometry(this.globeRadius + 10, 32, 32);
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x17ceb2,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide
    });
    this.atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    this.globeGroup.add(this.atmosphereMesh);
  }
  
  createStarfield() {
    const starCount = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
      // Random coordinates in space
      const radius = 300 + Math.random() * 500;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
      
      // Star Colors (mix of white, teal, gold)
      const r = Math.random();
      if (r < 0.6) {
        colors[i] = 1.0; colors[i + 1] = 1.0; colors[i + 2] = 1.0; // White
      } else if (r < 0.8) {
        colors[i] = 0.09; colors[i + 1] = 0.8; colors[i + 2] = 0.7; // Teal
      } else {
        colors[i] = 0.96; colors[i + 1] = 0.72; colors[i + 2] = 0.15; // Gold
      }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });
    
    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }
  
  createPins() {
    properties.forEach((property) => {
      const position = this.latLngToVector3(property.lat, property.lng, this.globeRadius);
      const isHotel = property.type === 'hotel';
      const color = isHotel ? 0x17ceb2 : 0xf5b927;
      
      // Pin Container Group
      const pinGroup = new THREE.Group();
      pinGroup.position.copy(position);
      
      // Orient the pin pointing straight out from globe center
      const normalVector = position.clone().normalize();
      const upVector = new THREE.Vector3(0, 1, 0);
      pinGroup.quaternion.setFromUnitVectors(upVector, normalVector);
      
      // 1. Hologram Beacon Line (height guide)
      const beamHeight = 25;
      const beamGeo = new THREE.CylinderGeometry(0.2, 0.5, beamHeight, 4);
      beamGeo.translate(0, beamHeight / 2, 0); // shift base to origin
      const beamMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      pinGroup.add(beamMesh);
      
      // 2. Pulse Ring (horizontal circle on the globe surface)
      const ringGeo = new THREE.RingGeometry(1, 4, 16);
      ringGeo.rotateX(-Math.PI / 2); // align flat
      const ringMat = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      pinGroup.add(ringMesh);
      
      // 3. Top Point Orb
      const orbGeo = new THREE.SphereGeometry(3, 16, 16);
      orbGeo.translate(0, beamHeight, 0); // place on top of beam
      const orbMat = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 1.5,
        shininess: 100
      });
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      
      // Attach listing ID for raycasting reference
      orbMesh.userData = { propertyId: property.id };
      pinGroup.add(orbMesh);
      
      // Save meshes for hover/animate references
      this.pins.push({
        group: pinGroup,
        orb: orbMesh,
        ring: ringMesh,
        beam: beamMesh,
        property: property,
        baseColor: color
      });
      
      this.globeGroup.add(pinGroup);
    });
  }
  
  latLngToVector3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    
    const x = -(radius * Math.sin(phi) * Math.sin(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    
    return new THREE.Vector3(x, y, z);
  }
  
  bindEvents() {
    this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.container.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.container.addEventListener('pointerup', () => this.onPointerUp());
    
    // Window Resize
    window.addEventListener('resize', () => this.onWindowResize());
  }
  
  onPointerDown(event) {
    this.isDragging = true;
    this.autoRotate = false;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / this.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / this.height) * 2 + 1;
    
    this.mouseOnDownX = mouseX;
    this.mouseOnDownY = mouseY;
    
    this.targetRotationOnMouseDownX = this.targetRotationX;
    this.targetRotationOnMouseDownY = this.targetRotationY;
    
    // Check if clicked a pin immediately
    this.checkIntersection(event);
  }
  
  onPointerMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / this.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / this.height) * 2 + 1;
    
    this.mouse.x = mouseX;
    this.mouse.y = mouseY;
    
    if (this.isDragging) {
      const zoomModifier = (this.camera.position.z / 450); // make dragging slower when zoomed in
      const deltaX = (mouseX - this.mouseOnDownX) * 2 * zoomModifier;
      const deltaY = (mouseY - this.mouseOnDownY) * 2 * zoomModifier;
      
      this.targetRotationY = this.targetRotationOnMouseDownY + deltaX;
      this.targetRotationX = this.targetRotationOnMouseDownX - deltaY;
      
      // Limit vertical rotation to avoid pole flips
      this.targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotationX));
    } else {
      // Hover effect checks on cursor move
      this.checkHover(event);
    }
  }
  
  onPointerUp() {
    this.isDragging = false;
    // Resume auto rotation after 4 seconds of inactivity
    if (this.autoRotateTimeout) clearTimeout(this.autoRotateTimeout);
    this.autoRotateTimeout = setTimeout(() => {
      this.autoRotate = true;
    }, 5000);
  }
  
  checkHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Collect all click targets (orbs)
    const targets = this.pins.map(p => p.orb);
    const intersects = this.raycaster.intersectObjects(targets);
    
    let hoveredPinId = null;
    
    if (intersects.length > 0) {
      const hitOrb = intersects[0].object;
      hoveredPinId = hitOrb.userData.propertyId;
      document.body.classList.add('hovering-interactive');
    } else {
      document.body.classList.remove('hovering-interactive');
    }
    
    // Animate orbs on hover
    this.pins.forEach(pin => {
      if (pin.property.id === hoveredPinId) {
        gsap.to(pin.orb.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.2 });
        gsap.to(pin.orb.material, { emissiveIntensity: 2.5, duration: 0.2 });
      } else {
        gsap.to(pin.orb.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
        gsap.to(pin.orb.material, { emissiveIntensity: 1.5, duration: 0.2 });
      }
    });
  }
  
  checkIntersection(event) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const targets = this.pins.map(p => p.orb);
    const intersects = this.raycaster.intersectObjects(targets);
    
    if (intersects.length > 0) {
      const clickedOrb = intersects[0].object;
      const propertyId = clickedOrb.userData.propertyId;
      const selectedPin = this.pins.find(p => p.property.id === propertyId);
      
      if (selectedPin) {
        this.focusOnPin(selectedPin);
        if (this.onPinSelect) {
          this.onPinSelect(selectedPin.property);
        }
      }
    }
  }
  
  focusOnPin(pin) {
    this.autoRotate = false;
    if (this.autoRotateTimeout) clearTimeout(this.autoRotateTimeout);
    
    // Zoom camera towards pin
    const pinWorldPosition = new THREE.Vector3();
    pin.orb.getWorldPosition(pinWorldPosition);
    
    // Calculate normal vector from globe center
    const targetDirection = pinWorldPosition.clone().normalize();
    
    // Position camera slightly offset from the pin normal so visual remains pleasant
    const targetCamPos = targetDirection.clone().multiplyScalar(this.globeRadius + 180);
    
    // Smooth transition camera position using GSAP
    gsap.to(this.camera.position, {
      x: targetCamPos.x,
      y: targetCamPos.y,
      z: targetCamPos.z,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.camera.lookAt(0, 0, 0);
      }
    });
    
    // Pulse animation on the selected pin's ring
    gsap.timeline()
      .to(pin.ring.scale, { x: 4, y: 4, z: 4, duration: 0.6 })
      .to(pin.ring.material, { opacity: 0, duration: 0.6 }, "<")
      .set(pin.ring.scale, { x: 1, y: 1, z: 1 })
      .to(pin.ring.material, { opacity: 0.8, duration: 0.2 });
  }
  
  resetView() {
    this.autoRotate = true;
    gsap.to(this.camera.position, {
      x: 0,
      y: 0,
      z: 450,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.camera.lookAt(0, 0, 0);
      }
    });
  }
  
  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(this.width, this.height);
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Auto Rotation logic
    if (this.autoRotate) {
      this.targetRotationY += 0.002;
    }
    
    // Smooth interpolation (Lerping) for dragging
    this.globeGroup.rotation.y += (this.targetRotationY - this.globeGroup.rotation.y) * 0.08;
    this.globeGroup.rotation.x += (this.targetRotationX - this.globeGroup.rotation.x) * 0.08;
    
    // Subtle starfield rotation
    if (this.starfield) {
      this.starfield.rotation.y += 0.0003;
      this.starfield.rotation.x += 0.0001;
    }
    
    // Pulse animation of rings on pins
    this.pins.forEach(pin => {
      if (pin.ring) {
        // Pulse ring scales and fades out procedurally
        const time = Date.now() * 0.003;
        const scaleVal = 1 + (Math.sin(time + pin.property.lat) * 0.3);
        pin.ring.scale.set(scaleVal, scaleVal, scaleVal);
      }
    });
    
    this.renderer.render(this.scene, this.camera);
  }
}
