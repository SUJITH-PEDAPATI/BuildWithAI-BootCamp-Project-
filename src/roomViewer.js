import * as THREE from 'three';
import gsap from 'gsap';

export class RoomViewer3D {
  constructor(canvasId, containerId) {
    this.canvas = document.getElementById(canvasId);
    this.container = document.getElementById(containerId);
    
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    
    // Camera orbit parameters
    this.spherical = {
      radius: 70,
      theta: Math.PI / 4, // horizontal angle
      phi: Math.PI / 3    // vertical angle
    };
    
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    
    this.activeProperty = null;
    this.selectedOptionId = null;
    this.onOptionSelect = null;
    
    // Store lights for quick updates
    this.lights = {};
    this.roomMeshes = [];
    this.tableMeshes = [];
    
    this.init();
  }
  
  init() {
    // 1. Scene Setup
    this.scene = new THREE.Scene();
    
    // 2. Camera Setup
    this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 0.1, 1000);
    this.updateCameraPosition();
    
    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 4. Lighting Initialization
    this.setupLighting();
    
    // 5. Environment Grid Floor
    const gridHelper = new THREE.GridHelper(100, 30, 0x17ceb2, 0x0a0f1d);
    gridHelper.position.y = -0.1;
    this.scene.add(gridHelper);
    
    // 6. Bind Drag Interaction
    this.bindEvents();
    
    // 7. Render Loop
    this.animate();
  }
  
  setupLighting() {
    // Soft Ambient Light
    this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(this.lights.ambient);
    
    // Directional Key Light (casting shadows)
    this.lights.directional = new THREE.DirectionalLight(0xffffff, 1.2);
    this.lights.directional.position.set(30, 45, 20);
    this.lights.directional.castShadow = true;
    this.lights.directional.shadow.mapSize.width = 1024;
    this.lights.directional.shadow.mapSize.height = 1024;
    this.lights.directional.shadow.bias = -0.001;
    this.scene.add(this.lights.directional);
    
    // Neon Ambient Fill Light
    this.lights.point1 = new THREE.PointLight(0x17ceb2, 1.8, 80);
    this.lights.point1.position.set(-15, 10, -15);
    this.scene.add(this.lights.point1);
    
    this.lights.point2 = new THREE.PointLight(0xf5b927, 0.8, 60);
    this.lights.point2.position.set(20, 15, -10);
    this.scene.add(this.lights.point2);
    
    // Default lighting mode: Sunset
    this.applyLightingMode('sunset');
  }
  
  applyLightingMode(mode) {
    const duration = 0.8;
    
    switch (mode) {
      case 'sunset':
        gsap.to(this.lights.ambient.color, { r: 1.0, g: 0.85, b: 0.8, duration });
        gsap.to(this.lights.directional.color, { r: 1.0, g: 0.72, b: 0.47, duration });
        this.lights.directional.intensity = 1.6;
        
        gsap.to(this.lights.point1.color, { r: 0.9, g: 0.3, b: 0.2, duration }); // Red/Orange glow
        gsap.to(this.lights.point2.color, { r: 0.96, g: 0.72, b: 0.15, duration }); // Gold
        break;
        
      case 'midnight':
        gsap.to(this.lights.ambient.color, { r: 0.2, g: 0.3, b: 0.5, duration });
        gsap.to(this.lights.directional.color, { r: 0.4, g: 0.5, b: 0.8, duration });
        this.lights.directional.intensity = 0.5;
        
        gsap.to(this.lights.point1.color, { r: 0.1, g: 0.2, b: 0.8, duration }); // Deep Blue
        gsap.to(this.lights.point2.color, { r: 0.8, g: 0.8, b: 0.95, duration }); // Moon White
        break;
        
      case 'cyberpunk':
        gsap.to(this.lights.ambient.color, { r: 0.3, g: 0.1, b: 0.4, duration });
        gsap.to(this.lights.directional.color, { r: 0.9, g: 0.1, b: 0.7, duration }); // Hot Pink
        this.lights.directional.intensity = 1.0;
        
        gsap.to(this.lights.point1.color, { r: 0.09, g: 0.8, b: 0.7, duration }); // Glowing Teal
        gsap.to(this.lights.point2.color, { r: 0.8, g: 0.0, b: 0.8, duration }); // Purple
        break;
    }
  }
  
  loadPropertyScene(property, onOptionSelect) {
    this.activeProperty = property;
    this.onOptionSelect = onOptionSelect;
    
    // Clear existing objects
    this.clearRoom();
    
    // Show spinner if needed
    const loader = document.getElementById('room-loader');
    if (loader) {
      loader.style.display = 'flex';
      setTimeout(() => { loader.style.display = 'none'; }, 400);
    }
    
    if (property.type === 'hotel') {
      this.buildHotelRoom(property.rooms[0].id); // Load first room by default
    } else {
      this.buildRestaurantLayout(); // Load dining floor map
    }
    
    // Re-focus camera
    this.spherical.theta = Math.PI / 4;
    this.spherical.phi = Math.PI / 3.2;
    this.updateCameraPosition();
  }
  
  clearRoom() {
    this.roomMeshes.forEach(mesh => this.scene.remove(mesh));
    this.roomMeshes = [];
    
    this.tableMeshes.forEach(t => this.scene.remove(t.group));
    this.tableMeshes = [];
  }
  
  buildHotelRoom(selectedRoomId) {
    this.selectedOptionId = selectedRoomId;
    const isSuite = selectedRoomId.includes('r2'); // h1-r2/h2-r2 are Suites
    
    // 1. Room Floor Platform
    const floorGeo = new THREE.BoxGeometry(40, 1.5, 30);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x1e293b, shininess: 10 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.75;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);
    this.roomMeshes.push(floorMesh);
    
    // 2. Headboard / Back Wall
    const wallGeo = new THREE.BoxGeometry(40, 18, 1);
    const wallMat = new THREE.MeshPhongMaterial({ color: 0x0f172a });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(0, 9, -15);
    wallMesh.receiveShadow = true;
    wallMesh.castShadow = true;
    this.scene.add(wallMesh);
    this.roomMeshes.push(wallMesh);
    
    // 3. Bed Frame & Headboard
    const bedGroup = new THREE.Group();
    
    const frameGeo = isSuite ? new THREE.BoxGeometry(20, 3, 22) : new THREE.BoxGeometry(14, 3, 20);
    const frameMat = new THREE.MeshPhongMaterial({ color: 0x475569 });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.y = 1.5;
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    bedGroup.add(frameMesh);
    
    // Mattress
    const matGeo = isSuite ? new THREE.BoxGeometry(19, 2.5, 21) : new THREE.BoxGeometry(13.2, 2.5, 19);
    const matMat = new THREE.MeshPhongMaterial({ color: 0xe2e8f0 });
    const matMesh = new THREE.Mesh(matGeo, matMat);
    matMesh.position.y = 4.25;
    matMesh.castShadow = true;
    matMesh.receiveShadow = true;
    bedGroup.add(matMesh);
    
    // Pillows
    const pillowCount = isSuite ? 4 : 2;
    const pillowWidth = isSuite ? 6 : 5;
    const pillowGeo = new THREE.BoxGeometry(pillowWidth, 1.2, 3.5);
    const pillowMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    
    if (pillowCount === 2) {
      const p1 = new THREE.Mesh(pillowGeo, pillowMat);
      p1.position.set(-3, 5.5, -7);
      p1.rotation.x = -0.1;
      p1.castShadow = true;
      bedGroup.add(p1);
      
      const p2 = p1.clone();
      p2.position.x = 3;
      bedGroup.add(p2);
    } else {
      for (let i = 0; i < 2; i++) {
        const p1 = new THREE.Mesh(pillowGeo, pillowMat);
        p1.position.set(-5 + i * 3, 5.5, -8);
        p1.rotation.x = -0.1;
        p1.castShadow = true;
        bedGroup.add(p1);
        
        const p2 = p1.clone();
        p2.position.x = 2 + i * 3;
        bedGroup.add(p2);
      }
    }
    
    // Luxury Duvet Layer
    const duvetGeo = isSuite ? new THREE.BoxGeometry(19.2, 2.6, 14) : new THREE.BoxGeometry(13.4, 2.6, 12);
    const duvetMat = new THREE.MeshPhongMaterial({ color: isSuite ? 0x17ceb2 : 0xf5b927 });
    const duvetMesh = new THREE.Mesh(duvetGeo, duvetMat);
    duvetMesh.position.set(0, 4.3, 3);
    duvetMesh.castShadow = true;
    bedGroup.add(duvetMesh);
    
    bedGroup.position.set(0, 0, -2);
    this.scene.add(bedGroup);
    this.roomMeshes.push(bedGroup);
    
    // 4. Nightstands (Left & Right)
    const tableGeo = new THREE.BoxGeometry(3.5, 3.5, 3.5);
    const tableMat = new THREE.MeshPhongMaterial({ color: 0x0f172a });
    
    const leftTable = new THREE.Mesh(tableGeo, tableMat);
    const offset = isSuite ? 13 : 10;
    leftTable.position.set(-offset, 1.75, -12);
    leftTable.castShadow = true;
    leftTable.receiveShadow = true;
    this.scene.add(leftTable);
    this.roomMeshes.push(leftTable);
    
    const rightTable = leftTable.clone();
    rightTable.position.x = offset;
    this.scene.add(rightTable);
    this.roomMeshes.push(rightTable);
    
    // Glowing Nightstand Lamps
    const lampBaseGeo = new THREE.CylinderGeometry(0.3, 0.3, 2, 8);
    const lampShadeGeo = new THREE.CylinderGeometry(1.2, 1.6, 2, 12);
    const lampBaseMat = new THREE.MeshPhongMaterial({ color: 0xf5b927, metalness: 0.8 });
    const lampShadeMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb, transparent: true, opacity: 0.95 });
    
    const lampL = new THREE.Group();
    const bL = new THREE.Mesh(lampBaseGeo, lampBaseMat);
    bL.position.y = 1;
    const sL = new THREE.Mesh(lampShadeGeo, lampShadeMat);
    sL.position.y = 2.5;
    lampL.add(bL);
    lampL.add(sL);
    lampL.position.set(-offset, 3.5, -12);
    this.scene.add(lampL);
    this.roomMeshes.push(lampL);
    
    const lampR = lampL.clone();
    lampR.position.x = offset;
    this.scene.add(lampR);
    this.roomMeshes.push(lampR);
    
    // 5. If Suite - add extra luxury elements (couch, plant)
    if (isSuite) {
      const sofaGroup = new THREE.Group();
      
      // Sofa Base
      const sofaBaseGeo = new THREE.BoxGeometry(18, 2.5, 6);
      const sofaBaseMat = new THREE.MeshPhongMaterial({ color: 0x334155 });
      const sofaBase = new THREE.Mesh(sofaBaseGeo, sofaBaseMat);
      sofaBase.position.y = 1.25;
      sofaBase.castShadow = true;
      sofaGroup.add(sofaBase);
      
      // Sofa Backrest
      const backGeo = new THREE.BoxGeometry(18, 5, 1.5);
      const backMesh = new THREE.Mesh(backGeo, sofaBaseMat);
      backMesh.position.set(0, 3.5, -2.25);
      backMesh.castShadow = true;
      sofaGroup.add(backMesh);
      
      sofaGroup.position.set(0, 0, 10);
      this.scene.add(sofaGroup);
      this.roomMeshes.push(sofaGroup);
    }
  }
  
  buildRestaurantLayout() {
    // 1. Restaurant Floor Platform
    const floorGeo = new THREE.BoxGeometry(40, 1.5, 30);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x090d1a, shininess: 20 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.75;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);
    this.roomMeshes.push(floorMesh);
    
    // 2. Build 6 tables dynamically on a grid
    const tablePositions = [
      { id: "t1", x: -12, z: -8, type: "Dome View", size: 4 },
      { id: "t2", x: 0, z: -8, type: "Dome View", size: 4 },
      { id: "t3", x: 12, z: -8, type: "Exclusive Alcove", size: 2 },
      { id: "t4", x: -12, z: 6, type: "Chef's Counter", size: 2 },
      { id: "t5", x: 0, z: 6, type: "Window Table", size: 4 },
      { id: "t6", x: 12, z: 6, type: "Window Table", size: 4 }
    ];
    
    tablePositions.forEach((pos, idx) => {
      const tableGroup = new THREE.Group();
      tableGroup.position.set(pos.x, 0, pos.z);
      
      // Table base column
      const colGeo = new THREE.CylinderGeometry(0.8, 1.2, 5, 16);
      const colMat = new THREE.MeshPhongMaterial({ color: 0x334155, metalness: 0.7 });
      const column = new THREE.Mesh(colGeo, colMat);
      column.position.y = 2.5;
      column.castShadow = true;
      column.receiveShadow = true;
      tableGroup.add(column);
      
      // Table Top
      const topGeo = pos.size === 4 ? new THREE.CylinderGeometry(5, 5, 0.4, 32) : new THREE.CylinderGeometry(3.5, 3.5, 0.4, 32);
      const topMat = new THREE.MeshPhongMaterial({ color: 0x1e293b, shininess: 80 });
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.position.y = 5.2;
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      tableGroup.add(topMesh);
      
      // Interactive Floating Pin / Orb on top of Table
      const pinGeo = new THREE.SphereGeometry(1.2, 16, 16);
      const pinColor = idx === 0 ? 0x17ceb2 : 0xf5b927;
      const pinMat = new THREE.MeshPhongMaterial({
        color: pinColor,
        emissive: pinColor,
        emissiveIntensity: 1.0,
        shininess: 100
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.y = 7.5;
      pinMesh.userData = { tableId: pos.id, tableIndex: idx };
      tableGroup.add(pinMesh);
      
      // Chairs
      const chairCount = pos.size;
      const chairGeo = new THREE.BoxGeometry(1.6, 2.5, 1.6);
      const chairMat = new THREE.MeshPhongMaterial({ color: 0x111827 });
      const radius = pos.size === 4 ? 4.2 : 3.0;
      
      for (let c = 0; c < chairCount; c++) {
        const angle = (c / chairCount) * Math.PI * 2;
        const chair = new THREE.Mesh(chairGeo, chairMat);
        chair.position.set(Math.cos(angle) * radius, 1.25, Math.sin(angle) * radius);
        chair.rotation.y = -angle + Math.PI / 2;
        chair.castShadow = true;
        tableGroup.add(chair);
      }
      
      this.scene.add(tableGroup);
      this.tableMeshes.push({
        id: pos.id,
        group: tableGroup,
        pin: pinMesh,
        index: idx
      });
    });
    
    // Select first table by default
    this.selectOption("t1");
  }
  
  selectOption(optionId) {
    this.selectedOptionId = optionId;
    
    // 1. If viewing a Hotel Room
    if (this.activeProperty && this.activeProperty.type === 'hotel') {
      this.buildHotelRoom(optionId);
    } 
    // 2. If selecting a Restaurant Table
    else {
      this.tableMeshes.forEach(table => {
        const isSelected = table.id === optionId;
        const color = isSelected ? 0x17ceb2 : 0xf5b927;
        
        table.pin.material.color.setHex(color);
        table.pin.material.emissive.setHex(color);
        
        if (isSelected) {
          gsap.to(table.pin.scale, { x: 1.6, y: 1.6, z: 1.6, duration: 0.3, yoyo: true, repeat: 1 });
          gsap.to(table.pin.position, { y: 8.2, duration: 0.3 });
          
          // Position camera slightly looking at this table
          const targetX = table.group.position.x;
          const targetZ = table.group.position.z;
          
          gsap.to(this.spherical, {
            radius: 50,
            duration: 1.0,
            onUpdate: () => this.updateCameraPosition(new THREE.Vector3(targetX, 2, targetZ))
          });
        } else {
          gsap.to(table.pin.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
          gsap.to(table.pin.position, { y: 7.5, duration: 0.3 });
        }
      });
    }
  }
  
  bindEvents() {
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerup', () => this.onPointerUp());
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
    
    window.addEventListener('resize', () => this.onWindowResize());
  }
  
  onPointerDown(event) {
    this.isDragging = true;
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
    
    // Check if user clicked a floating table pin in restaurant mode
    if (this.activeProperty && this.activeProperty.type === 'restaurant') {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / this.width) * 2 - 1;
      const mouseY = -((event.clientY - rect.top) / this.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera);
      
      const targets = this.tableMeshes.map(t => t.pin);
      const intersects = raycaster.intersectObjects(targets);
      
      if (intersects.length > 0) {
        const clickedPin = intersects[0].object;
        const tableId = clickedPin.userData.tableId;
        this.selectOption(tableId);
        
        if (this.onOptionSelect) {
          this.onOptionSelect(tableId);
        }
      }
    }
  }
  
  onPointerMove(event) {
    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;
      
      this.spherical.theta -= deltaX * 0.007;
      this.spherical.phi -= deltaY * 0.007;
      
      // Limit vertical rotation angle
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.spherical.phi));
      
      this.updateCameraPosition();
      
      this.previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    }
  }
  
  onPointerUp() {
    this.isDragging = false;
  }
  
  onWheel(event) {
    event.preventDefault();
    this.spherical.radius += event.deltaY * 0.05;
    this.spherical.radius = Math.max(30, Math.min(120, this.spherical.radius));
    this.updateCameraPosition();
  }
  
  updateCameraPosition(targetLookAt = new THREE.Vector3(0, 4, 0)) {
    const x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    const y = this.spherical.radius * Math.cos(this.spherical.phi);
    const z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
    
    // Offset relative to target lookat coordinates
    this.camera.position.set(x + targetLookAt.x, y + targetLookAt.y, z + targetLookAt.z);
    this.camera.lookAt(targetLookAt);
  }
  
  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(this.width, this.height);
  }
  
  resetCamera() {
    gsap.to(this.spherical, {
      radius: 70,
      theta: Math.PI / 4,
      phi: Math.PI / 3,
      duration: 1.2,
      ease: 'power2.out',
      onUpdate: () => this.updateCameraPosition()
    });
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Gentle rotation hover on floating pins
    this.tableMeshes.forEach(table => {
      if (table.pin) {
        table.pin.rotation.y += 0.015;
        // Bobbing animation
        table.pin.position.y += Math.sin(Date.now() * 0.003 + table.index) * 0.004;
      }
    });
    
    this.renderer.render(this.scene, this.camera);
  }
}
