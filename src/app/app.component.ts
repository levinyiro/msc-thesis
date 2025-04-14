import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DataService } from './services/data.service';
import { MonitorService } from './services/monitor.service';
import { PlanetOrbitData } from "./_workers/models/objectData";
import * as THREE from 'three';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('inputShowLine') inputShowLine!: ElementRef<HTMLInputElement>;
  
  mercureData: any;
  venusData: any;
  earthData: any;
  marsData: any;
  jupiterData: any;
  saturnData: any;
  uranusData: any;
  neptuneData: any;

  cpuUsage: string = '';
  memoryUsage: string = '';
  gpuUsage: string = '';
  fps: string = '';

  isAddingPlanet = false;
  newPlanetData: any = {};

  // Three.js variables
  private renderer!: any;
  private scene!: any;
  private camera!: any;
  private canvas!: HTMLCanvasElement;
  
  private sun: any;
  private earth: any;
  private sunSpotLight: any;
  private orbitPath: any;
  private mercure: any;
  private venus: any = null;
  private mars: any = null;
  private jupiter: any = null;
  private saturn: any = null;
  private uranus: any = null;
  private neptune: any = null;
  
  private earthAngle = 0;
  private mercureAngle = 0;
  private venusAngle = 0;
  private marsAngle = 0;
  private jupiterAngle = 0;
  private saturnAngle = 0;
  private uranusAngle = 0;
  private neptuneAngle = 0;
  
  private showLines = true;
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private yaw = 0;
  private pitch = 0;
  private earthSpeed!: number;
  private mercureSpeed!: number;
  private venusSpeed!: number;
  private moonSpeed!: number;
  private marsSpeed!: number;
  private jupiterSpeed!: number;
  private saturnSpeed!: number;
  private uranusSpeed!: number;
  private neptuneSpeed!: number;
  private orbitLines: any[] = [];
  private moon: any;
  private moonAngle = 0;
  private readonly moonDistance = 2;
  private readonly distanceDivider = 5000000;
  
  private frameCount = 0;
  private lastFpsUpdate = performance.now();
  
  private isAddingPlanetThree = false;
  private previewPlanet: any | null = null;
  private previewOrbit: any | null = null;
  private customPlanets: {
    mesh: any;
    angle: number;
    speed: number;
    data: PlanetOrbitData;
  }[] = [];
  
  private customPlanetsIndex = 0;
  private targetObject: any;
  private cameraTargetPosition = new THREE.Vector3();
  
  private readonly ANIMATION_SPEED = 0.0001;

  private loggingInterval: any;

  constructor(private dataService: DataService, private monitorService: MonitorService) { }

  ngOnInit() {
    this.monitorSystemStats();

    this.dataService.getMercureData().subscribe(data => {
      this.mercureData = data;
      this.handleMercureData(data);
    });
    
    this.dataService.getVenusData().subscribe(data => {
      this.venusData = data;
      this.handleVenusData(data);
    });

    this.dataService.getEarthData().subscribe(data => {
      this.earthData = data;
      this.handleEarthData(data);
    });

    this.dataService.getMarsData().subscribe(data => {
      this.marsData = data;
      this.handleMarsData(data);
    });

    this.dataService.getJupiterData().subscribe(data => {
      this.jupiterData = data;
      this.handleJupiterData(data);
    });

    this.dataService.getSaturnData().subscribe(data => {
      this.saturnData = data;
      this.handleSaturnData(data);
    });

    this.dataService.getUranusData().subscribe(data => {
      this.uranusData = data;
      this.handleUranusData(data);
    });

    this.dataService.getNeptuneData().subscribe(data => {
      this.neptuneData = data;
      this.handleNeptuneData(data);
    });
  }

  ngAfterViewInit() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.initThreeJS();
    this.setupEventListeners();
  }

  private initThreeJS() {
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas, 
      antialias: true, 
      alpha: true 
    });
    this.renderer.setClearColor(0x111111);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, this.canvas.width / this.canvas.height, 0.1, 1000);
    this.camera.position.z = 100;
    this.camera.position.y = 20;
    this.camera.rotation.x = -0.3;
    this.cameraTargetPosition.copy(this.camera.position);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    this.loadTextures().then(textures => {
      this.createScene(textures);
      this.animate();
    }).catch(error => {
      console.error('Error loading textures:', error);
    });
  }

  private addStars(count: number) {
    const starGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sphereRadius = 500;

    for (let i = 0; i < count; i++) {
      const star = new THREE.Mesh(starGeometry, starMaterial);

      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);

      star.position.x = sphereRadius * Math.sin(phi) * Math.cos(theta);
      star.position.y = sphereRadius * Math.sin(phi) * Math.sin(theta);
      star.position.z = sphereRadius * Math.cos(phi);

      this.scene.add(star);
    }
  }

  private createOrbitLine(data: PlanetOrbitData): any {
    if (!data) return null;

    const perihelion = data.perihelion / this.distanceDivider;
    const aphelion = data.aphelion / this.distanceDivider;
    const eccentricity = data.eccentricity;

    const semiMajorAxis = (perihelion + aphelion) / 2;
    const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - Math.pow(eccentricity, 2));

    const orbitCurve = new THREE.EllipseCurve(
      0, 0, semiMajorAxis, semiMinorAxis, 0, 2 * Math.PI, false, 0
    );

    const points = orbitCurve.getPoints(100000);
    const orbitPathGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const orbitPathMaterial = new THREE.LineBasicMaterial({ color: data.color });
    const orbitPath = new THREE.Line(orbitPathGeometry, orbitPathMaterial);
    orbitPath.rotation.x = Math.PI / 2;

    this.scene.add(orbitPath);
    this.orbitLines.push(orbitPath);
    return orbitPath;
  }

  private calculateSpeedFromVolatility(data: any, baseSpeed: number): number {
    const eccentricityFactor = data.eccentricity || 0;
    const massFactor = data.mass ? data.mass.massValue * Math.pow(10, data.mass.massExponent) : 1;

    const normalizedMass = Math.log10(massFactor) / 30;
    const normalizedEccentricity = eccentricityFactor;

    const volatility = normalizedMass + normalizedEccentricity;
    return baseSpeed * (0.5 + volatility * 1.5);
  }

  private getAxialTilt(degree: number) {
    return (degree || 0) * (Math.PI / 180);
  }

  private async loadTextures() {
    const textureUrls = [
      { name: 'sunBitmap', url: '../assets/textures/sun.jpg' },
      { name: 'earthBitmap', url: '../assets/textures/earth.jpg' },
      { name: 'mercureBitmap', url: '../assets/textures/mercure.jpg' },
      { name: 'venusBitmap', url: '../assets/textures/venus.jpg' },
      { name: 'marsBitmap', url: '../assets/textures/mars.jpg' },
      { name: 'jupiterBitmap', url: '../assets/textures/jupiter.jpg' },
      { name: 'saturnBitmap', url: '../assets/textures/saturn.jpg' },
      { name: 'uranusBitmap', url: '../assets/textures/uranus.jpg' },
      { name: 'neptuneBitmap', url: '../assets/textures/neptune.jpg' },
      { name: 'moonBitmap', url: '../assets/textures/moon.jpg' },
      { name: 'lensflareBitmap', url: '../assets/lensflare.png' }
    ];

    const textures: any = {};

    for (const { name, url } of textureUrls) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        textures[name] = bitmap;
      } catch (error) {
        console.error(`Error loading texture ${name} from ${url}:`, error);
      }
    }

    return textures;
  }

  private getGlow(bitmap: any, size: number) {
    const glowTexture = new THREE.Texture(bitmap);
    glowTexture.needsUpdate = true;

    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffffaa,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.8
    });

    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.set(size, size, size);

    return glow;
  }

  private animate() {
    if (this.sun) {
      this.sunSpotLight.position.copy(this.sun.position);
      if (this.earth) {
        this.sunSpotLight.target.position.set(this.earth.position.x, this.earth.position.y, this.earth.position.z);
      }
      this.sunSpotLight.target.updateMatrixWorld();
    }

    if (this.earth) {
      this.earthAngle += this.earthSpeed;
      this.earth.rotation.y += 0.05;
      this.earth.position.x = Math.sin(this.earthAngle) * (this.earthData ? this.earthData.semimajorAxis / this.distanceDivider : 8);
      this.earth.position.z = Math.cos(this.earthAngle) * (this.earthData ? this.earthData.semimajorAxis / this.distanceDivider : 8);
    }

    if (this.mercure) {
      this.mercureAngle += this.mercureSpeed;
      this.mercure.rotation.y += 0.05;
      this.mercure.position.x = Math.sin(this.mercureAngle) * (this.mercureData ? this.mercureData.semimajorAxis / this.distanceDivider : 8);
      this.mercure.position.z = Math.cos(this.mercureAngle) * (this.mercureData ? this.mercureData.semimajorAxis / this.distanceDivider : 8);
    }

    if (this.venus) {
      this.venusAngle += this.venusSpeed;
      this.venus.rotation.y += 0.05;
      this.venus.position.x = Math.sin(this.venusAngle) * (this.venusData ? this.venusData.semimajorAxis / this.distanceDivider : 8);
      this.venus.position.z = Math.cos(this.venusAngle) * (this.venusData ? this.venusData.semimajorAxis / this.distanceDivider : 8);
    }

    if (this.moon && this.earth) {
      this.moonAngle += this.moonSpeed;
      this.moon.position.x = this.earth.position.x + Math.sin(this.moonAngle) * this.moonDistance;
      this.moon.position.z = this.earth.position.z + Math.cos(this.moonAngle) * this.moonDistance;
    }

    if (this.mars) {
      this.marsAngle += this.marsSpeed;
      this.mars.rotation.y += 0.05;
      this.mars.position.x = Math.sin(this.marsAngle) * (this.marsData ? this.marsData.semimajorAxis / this.distanceDivider : 8);
      this.mars.position.z = Math.cos(this.marsAngle) * (this.marsData ? this.marsData.semimajorAxis / this.distanceDivider : 8);
    }

    if (this.jupiter) {
      this.jupiterAngle += this.jupiterSpeed;
      this.jupiter.rotation.y += 0.05;
      this.jupiter.position.x = Math.sin(this.jupiterAngle) * (this.jupiterData ? this.jupiterData.semimajorAxis / this.distanceDivider : 8);
      this.jupiter.position.z = Math.cos(this.jupiterAngle) * (this.jupiterData ? this.jupiterData.semimajorAxis / this.distanceDivider : 8);
    }

    if (this.saturn) {
      this.saturnAngle += this.saturnSpeed;
      this.saturn.rotation.y += 0.05;
      this.saturn.position.x = Math.sin(this.saturnAngle) * (this.saturnData ? this.saturnData.semimajorAxis / this.distanceDivider : 8);
      this.saturn.position.z = Math.cos(this.saturnAngle) * (this.saturnData ? this.saturnData.semimajorAxis / this.distanceDivider : 8);
    }

    if (this.uranus) {
      this.uranusAngle += this.uranusSpeed;
      this.uranus.rotation.y += 0.05;
      this.uranus.position.x = Math.sin(this.uranusAngle) * (this.uranusData ? this.uranusData.semimajorAxis / this.distanceDivider : 8);
      this.uranus.position.z = Math.cos(this.uranusAngle) * (this.uranusData ? this.uranusData.semimajorAxis / this.distanceDivider : 8);
    }

    if (this.neptune) {
      this.neptuneAngle += this.neptuneSpeed;
      this.neptune.rotation.y += 0.05;
      this.neptune.position.x = Math.sin(this.neptuneAngle) * (this.neptuneData ? this.neptuneData.semimajorAxis / this.distanceDivider : 8);
      this.neptune.position.z = Math.cos(this.neptuneAngle) * (this.neptuneData ? this.neptuneData.semimajorAxis / this.distanceDivider : 8);
    }

    // fps counting
    const now = performance.now();
    this.frameCount++;

    if (now - this.lastFpsUpdate >= 1000) {
      const fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      this.fps = fps.toString();
    }

    this.customPlanets.forEach(planet => {
      planet.angle += planet.speed;
      const orbitRadius = planet.data.semimajorAxis! / this.distanceDivider;
      planet.mesh.position.x = Math.sin(planet.angle) * orbitRadius;
      planet.mesh.position.z = Math.cos(planet.angle) * orbitRadius;
      planet.mesh.rotation.y += 0.05;
    });

    if (this.targetObject) {
      this.camera.lookAt(this.targetObject.position);
    }

    this.camera.position.lerp(this.cameraTargetPosition, 0.05);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }

  private createNewPlanet(data: PlanetOrbitData, position: any): any {
    const geometry = new THREE.SphereGeometry(data.size || 0.3, 32, 32);

    const material = new THREE.MeshPhongMaterial({
      color: data.color,
    });

    const planet = new THREE.Mesh(geometry, material);
    planet.position.copy(position);
    planet.rotation.z = this.getAxialTilt(data.axialTilt || 0);
    planet.castShadow = true;
    planet.receiveShadow = true;

    return planet;
  }

  private calculateOrbitDistance(position: any): number {
    return position.distanceTo(this.sun.position) * this.distanceDivider;
  }

  private createScene(textures: any) {
    const { sunBitmap, earthBitmap, mercureBitmap, venusBitmap, marsBitmap, jupiterBitmap, 
            saturnBitmap, uranusBitmap, neptuneBitmap, moonBitmap, lensflareBitmap } = textures;

    this.sunSpotLight = new THREE.SpotLight(0xe7c6ff, 6);
    this.sunSpotLight.castShadow = true;

    this.sunSpotLight.shadow.mapSize.width = 2056;
    this.sunSpotLight.shadow.mapSize.height = 2056;
    this.sunSpotLight.shadow.camera.near = 0.5;
    this.sunSpotLight.shadow.camera.far = 1000;
    this.sunSpotLight.shadow.penumbra = 0.5;
    this.sunSpotLight.shadow.focus = 1;

    this.sunSpotLight.position.set(0, 0, 0);
    this.sunSpotLight.angle = Math.PI / 6;
    this.sunSpotLight.penumbra = 0.2;
    this.sunSpotLight.decay = 2;
    this.sunSpotLight.distance = 1000;
    this.scene.add(this.sunSpotLight);
    this.sunSpotLight.target = new THREE.Object3D();
    this.scene.add(this.sunSpotLight.target);

    const sunTexture = new THREE.Texture(sunBitmap);
    sunTexture.needsUpdate = true;
    const sunGeometry = new THREE.SphereGeometry(2, 64, 32);
    const sunMaterial = new THREE.MeshPhongMaterial({
      map: sunTexture,
      emissive: 0x44fb8500,
      emissiveIntensity: 1.5,
    });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sun.receiveShadow = false;
    this.sun.name = 'sun';
    this.scene.add(this.sun);
    this.targetObject = this.sun;

    // lensflare
    this.sun.add(this.getGlow(lensflareBitmap, 10));

    this.addStars(1000);

    const earthTexture = new THREE.Texture(earthBitmap);
    earthTexture.needsUpdate = true;
    earthTexture.wrapS = THREE.RepeatWrapping;
    earthTexture.wrapT = THREE.RepeatWrapping;
    earthTexture.repeat.set(1, -1);
    const earthGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const earthMaterial = new THREE.MeshPhongMaterial({ map: earthTexture });
    this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
    if (this.earthData) {
      this.earth.rotation.z = this.getAxialTilt(this.earthData.axialTilt);
    }
    this.earth.castShadow = true;
    this.earth.receiveShadow = true;
    this.earth.name = 'earth';
    this.scene.add(this.earth);

    const moonTexture = new THREE.Texture(moonBitmap);
    moonTexture.needsUpdate = true;
    moonTexture.wrapS = THREE.RepeatWrapping;
    moonTexture.wrapT = THREE.RepeatWrapping;
    moonTexture.repeat.set(1, -1);
    const moonGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const moonMaterial = new THREE.MeshPhongMaterial({ map: moonTexture });
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);

    this.moon.position.x = this.earth.position.x + this.moonDistance;
    this.moon.position.z = this.earth.position.z;
    this.moon.castShadow = true;
    this.moon.receiveShadow = true;
    this.moon.name = 'moon';
    this.scene.add(this.moon);

    const mercureTexture = new THREE.Texture(mercureBitmap);
    mercureTexture.needsUpdate = true;
    const mercureGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const mercureMaterial = new THREE.MeshPhongMaterial({ map: mercureTexture });
    this.mercure = new THREE.Mesh(mercureGeometry, mercureMaterial);
    if (this.mercureData) {
      this.mercure.rotation.z = this.getAxialTilt(this.mercureData.axialTilt);
    }
    this.mercure.name = 'mercure';
    this.scene.add(this.mercure);

    const venusTexture = new THREE.Texture(venusBitmap);
    venusTexture.needsUpdate = true;
    const venusGeometry = new THREE.SphereGeometry(0.4, 32, 32);
    const venusMaterial = new THREE.MeshPhongMaterial({ map: venusTexture });
    this.venus = new THREE.Mesh(venusGeometry, venusMaterial);
    if (this.venusData) {
      this.venus.rotation.z = this.getAxialTilt(this.venusData.axialTilt);
    }
    this.venus.name = 'venus';
    this.scene.add(this.venus);

    const marsTexture = new THREE.Texture(marsBitmap);
    marsTexture.needsUpdate = true;
    const marsGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const marsMaterial = new THREE.MeshPhongMaterial({ map: marsTexture });
    this.mars = new THREE.Mesh(marsGeometry, marsMaterial);
    if (this.marsData) {
      this.mars.rotation.z = this.getAxialTilt(this.marsData.axialTilt);
    }
    this.mars.name = 'mars';
    this.scene.add(this.mars);

    const jupiterTexture = new THREE.Texture(jupiterBitmap);
    jupiterTexture.needsUpdate = true;
    const jupiterGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const jupiterMaterial = new THREE.MeshPhongMaterial({ map: jupiterTexture });
    this.jupiter = new THREE.Mesh(jupiterGeometry, jupiterMaterial);
    if (this.jupiterData) {
      this.jupiter.rotation.z = this.getAxialTilt(this.jupiterData.axialTilt);
    }
    this.jupiter.name = 'jupiter';
    this.scene.add(this.jupiter);

    const saturnTexture = new THREE.Texture(saturnBitmap);
    saturnTexture.needsUpdate = true;
    const saturnGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const saturnMaterial = new THREE.MeshPhongMaterial({ map: saturnTexture });
    this.saturn = new THREE.Mesh(saturnGeometry, saturnMaterial);
    if (this.saturnData) {
      this.saturn.rotation.z = this.getAxialTilt(this.saturnData.axialTilt);
    }
    this.saturn.name = 'saturn';
    this.scene.add(this.saturn);

    const uranusTexture = new THREE.Texture(uranusBitmap);
    uranusTexture.needsUpdate = true;
    const uranusGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const uranusMaterial = new THREE.MeshPhongMaterial({ map: uranusTexture });
    this.uranus = new THREE.Mesh(uranusGeometry, uranusMaterial);
    if (this.uranusData) {
      this.uranus.rotation.z = this.getAxialTilt(this.uranusData.axialTilt);
    }
    this.uranus.name = 'uranus';
    this.scene.add(this.uranus);

    const neptuneTexture = new THREE.Texture(neptuneBitmap);
    neptuneTexture.needsUpdate = true;
    const neptuneGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const neptuneMaterial = new THREE.MeshPhongMaterial({ map: neptuneTexture });
    this.neptune = new THREE.Mesh(neptuneGeometry, neptuneMaterial);
    if (this.neptuneData) {
      this.neptune.rotation.z = this.getAxialTilt(this.neptuneData.axialTilt);
    }
    this.neptune.name = 'neptune';
    this.scene.add(this.neptune);
  }

  private setupEventListeners() {
    this.canvas.addEventListener('mousedown', (event: MouseEvent) => {
      if (!this.camera || !this.scene) return;

      const rect = this.canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(
        (mouseX / this.canvas.width) * 2 - 1,
        -(mouseY / this.canvas.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(this.scene.children, true);

      if (intersects.length > 0) {
        const intersected = intersects[0].object;

        if (intersected.name) {
          this.targetObject = intersected;

          const targetPosition = intersects[0].point;
          const direction = new THREE.Vector3()
            .subVectors(this.camera.position, targetPosition)
            .normalize();

          const distance = 10;
          const newCameraPosition = targetPosition.clone().addScaledVector(direction, distance);

          this.camera.position.copy(newCameraPosition);
          this.camera.lookAt(targetPosition);
        }
      }

      if (this.isAddingPlanetThree) {
        const planetData = this.newPlanetData;

        const position = this.previewPlanet?.position.clone() ?? new THREE.Vector3(10, 0, 0);
        const orbitDistance = this.calculateOrbitDistance(position);

        const colorNum = typeof planetData.color === 'string'
          ? parseInt(planetData.color.replace('#', '0x'))
          : 0xfff000;

        const newPlanetData: PlanetOrbitData = {
          semimajorAxis: orbitDistance,
          perihelion: orbitDistance,
          aphelion: orbitDistance,
          eccentricity: 0,
          color: colorNum,
          axialTilt: planetData.axialTilt ?? 0,
          size: planetData.size ?? 0.3,
          mass: { massValue: 1, massExponent: 24 }
        };

        const newPlanet = this.createNewPlanet(newPlanetData, position);
        newPlanet.name = 'newPlanet' + ++this.customPlanetsIndex;
        this.scene.add(newPlanet);

        this.customPlanets.push({
          mesh: newPlanet,
          angle: Math.atan2(position.z, position.x),
          speed: this.calculateSpeedFromVolatility(newPlanetData, this.ANIMATION_SPEED),
          data: newPlanetData
        });

        if (this.previewPlanet) {
          this.scene.remove(this.previewPlanet);
          this.previewPlanet = null;
        }
        if (this.previewOrbit) {
          this.scene.remove(this.previewOrbit);
          this.previewOrbit = null;
        }

        if (this.showLines) {
          const permanentOrbit = this.createOrbitLine(newPlanetData);
          this.orbitLines.push(permanentOrbit);
        }

        this.isAddingPlanetThree = false;
        this.isAddingPlanet = false;
      } else {
        this.isDragging = true;
        this.previousMousePosition.x = event.clientX;
        this.previousMousePosition.y = event.clientY;
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('mousemove', (event: MouseEvent) => {
      if (this.isDragging) {
        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;
        
        this.yaw -= deltaX * 0.002;
        this.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.pitch - deltaY * 0.002));
        
        const radius = this.camera.position.distanceTo(this.targetObject.position);
        const x = radius * Math.cos(this.pitch) * Math.sin(this.yaw);
        const y = radius * Math.sin(this.pitch);
        const z = radius * Math.cos(this.pitch) * Math.cos(this.yaw);
        
        this.cameraTargetPosition.set(
          this.targetObject.position.x + x,
          this.targetObject.position.y + y, 
          this.targetObject.position.z + z
        );
        
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
      } else if (this.isAddingPlanetThree && this.previewPlanet) {
        const mouseX = (event.clientX / this.canvas.width) * 2 - 1;
        const mouseY = -(event.clientY / this.canvas.height) * 2 + 1;

        const vector = new THREE.Vector3(mouseX, mouseY, 0.5);
        vector.unproject(this.camera);
        const dir = vector.sub(this.camera.position).normalize();
        const distance = -this.camera.position.y / dir.y;
        const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));

        this.previewPlanet.position.copy(pos);

        if (this.previewOrbit) this.scene.remove(this.previewOrbit);

        const orbitData: PlanetOrbitData = {
          semimajorAxis: this.calculateOrbitDistance(pos),
          perihelion: this.calculateOrbitDistance(pos),
          aphelion: this.calculateOrbitDistance(pos),
          eccentricity: 0,
          color: 0xfff000,
          axialTilt: 0
        };

        if (this.previewOrbit) this.scene.remove(this.previewOrbit);
        this.previewOrbit = this.createOrbitLine(orbitData);
      }
    });

    const checkbox = document.getElementById('inputShowLine') as HTMLInputElement;
    checkbox.addEventListener('change', () => {
      this.toggleLines(checkbox.checked);
    });

    window.addEventListener('resize', () => {
      this.handleResize();
    });

    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        this.handleKeyDown(event.key);
      }
    });
  }

  private toggleLines(showLines: boolean) {
    this.showLines = showLines;

    this.orbitLines.forEach((line) => this.scene.remove(line));
    this.orbitLines = [];

    if (this.showLines) {
      if (this.earthData) this.createOrbitLine(this.earthData);
      if (this.venusData) this.createOrbitLine(this.venusData);
      if (this.mercureData) this.createOrbitLine(this.mercureData);
      if (this.marsData) this.createOrbitLine(this.marsData);
      if (this.jupiterData) this.createOrbitLine(this.jupiterData);
      if (this.saturnData) this.createOrbitLine(this.saturnData);
      if (this.uranusData) this.createOrbitLine(this.uranusData);
      if (this.neptuneData) this.createOrbitLine(this.neptuneData);
    }
  }

  private handleResize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    if (this.camera && this.renderer) {
      this.camera.aspect = rect.width / rect.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(rect.width, rect.height, false);
      this.renderer.setPixelRatio(window.devicePixelRatio);

      if (this.targetObject) {
        const radius = this.camera.position.distanceTo(this.targetObject.position);
        const x = radius * Math.cos(this.pitch) * Math.sin(this.yaw);
        const y = radius * Math.sin(this.pitch);
        const z = radius * Math.cos(this.pitch) * Math.cos(this.yaw);

        this.camera.position.set(
          this.targetObject.position.x + x,
          this.targetObject.position.y + y,
          this.targetObject.position.z + z
        );
        this.camera.lookAt(this.targetObject.position);

        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  private handleKeyDown(key: string) {
    const step = 2;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    if (key === 'ArrowUp') {
      this.cameraTargetPosition.addScaledVector(direction, step);
    }

    if (key === 'ArrowDown') {
      this.cameraTargetPosition.addScaledVector(direction, -step);
    }
  }

  private handleMercureData(data: PlanetOrbitData) {
    this.mercureData = data;
    this.mercureData.color = 0xe7e8ec;
    if (this.orbitPath) this.scene.remove(this.orbitPath);
    this.createOrbitLine(this.mercureData);
    this.mercureSpeed = this.calculateSpeedFromVolatility(this.mercureData, this.ANIMATION_SPEED);
    console.log('Received mercureData:', this.mercureData);
  }

  private handleVenusData(data: PlanetOrbitData) {
    this.venusData = data;
    this.venusData.color = 0xeecb8b;
    if (this.orbitPath) this.scene.remove(this.orbitPath);
    this.createOrbitLine(this.venusData);
    this.venusSpeed = this.calculateSpeedFromVolatility(this.venusData, this.ANIMATION_SPEED);
    console.log('Received venusData:', this.venusData);
  }

  private handleEarthData(data: PlanetOrbitData) {
    this.earthData = data;
    this.earthData.color = 0x6b93d6;
    if (this.orbitPath) this.scene.remove(this.orbitPath);
    this.createOrbitLine(this.earthData);
    this.earthSpeed = this.calculateSpeedFromVolatility(this.earthData, this.ANIMATION_SPEED);
    this.moonSpeed = 0.005;
    console.log('Received earthData:', this.earthData);
  }

  private handleMarsData(data: PlanetOrbitData) {
    this.marsData = data;
    this.marsData.color = 0x993d00;
    if (this.orbitPath) this.scene.remove(this.orbitPath);
    this.createOrbitLine(this.marsData);
    this.marsSpeed = this.calculateSpeedFromVolatility(this.marsData, this.ANIMATION_SPEED);
    console.log('Received marsData:', this.marsData);
  }

  private handleJupiterData(data: PlanetOrbitData) {
    this.jupiterData = data;
    this.jupiterData.color = 0xb07f35;
    if (this.orbitPath) this.scene.remove(this.orbitPath);
    this.createOrbitLine(this.jupiterData);
    this.jupiterSpeed = this.calculateSpeedFromVolatility(this.jupiterData, this.ANIMATION_SPEED);
    console.log('Received jupiterData:', this.jupiterData);
  }

  private handleSaturnData(data: PlanetOrbitData) {
    this.saturnData = data;
    this.saturnData.color = 0xb08f36;
    if (this.orbitPath) this.scene.remove(this.orbitPath);
    this.createOrbitLine(this.saturnData);
    this.saturnSpeed = this.calculateSpeedFromVolatility(this.saturnData, this.ANIMATION_SPEED);
    console.log('Received saturnData:', this.saturnData);
  }

  private handleUranusData(data: PlanetOrbitData) {
    this.uranusData = data;
    this.uranusData.color = 0x5580aa;
    if (this.orbitPath) this.scene.remove(this.orbitPath);
    this.createOrbitLine(this.uranusData);
    this.uranusSpeed = this.calculateSpeedFromVolatility(this.uranusData, this.ANIMATION_SPEED);
    console.log('Received uranusData:', this.uranusData);
  }

  private handleNeptuneData(data: PlanetOrbitData) {
    this.neptuneData = data;
    this.neptuneData.color = 0x366896;
    if (this.orbitPath) this.scene.remove(this.orbitPath);
    this.createOrbitLine(this.neptuneData);
    this.neptuneSpeed = this.calculateSpeedFromVolatility(this.neptuneData, this.ANIMATION_SPEED);
    console.log('Received neptuneData:', this.neptuneData);
  }

  private startAddingPlanetThree() {
    this.isAddingPlanetThree = true;

    const previewGeometry = new THREE.SphereGeometry(this.newPlanetData.size, 32, 32);
    const previewMaterial = new THREE.MeshPhongMaterial({
      color: 0xfff000,
      transparent: true,
      opacity: 0.7
    });
    this.previewPlanet = new THREE.Mesh(previewGeometry, previewMaterial);
    this.scene.add(this.previewPlanet);
  }

  monitorSystemStats() {
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
    }
  
    const estimateGpuPower = (renderer: string): number => {
      const gpuScores: { [key: string]: number } = {
        'Apple M2': 95,
        'Apple M1': 85,
        'Intel': 40,
        'NVIDIA': 90,
        'AMD': 80,
        'ANGLE': 60,
      };
  
      for (const [key, value] of Object.entries(gpuScores)) {
        if (renderer.includes(key)) return value;
      }
      return 50;
    };
  
    let gpuRenderer = 'Unknown GPU';
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuRenderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  
    const gpuScore = estimateGpuPower(gpuRenderer);
  
    let lastFrameTime = performance.now();
    const frameDurations: number[] = [];
  
    const measureGPU = () => {
      const now = performance.now();
      const duration = now - lastFrameTime;
      frameDurations.push(duration);
      if (frameDurations.length > 60) frameDurations.shift();
  
      lastFrameTime = now;
      requestAnimationFrame(measureGPU);
    };
    measureGPU();
  
    this.loggingInterval = setInterval(() => {
      let cpuUsage = 0;
  
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        const totalJSHeap = memoryInfo.totalJSHeapSize;
        const usedJSHeap = memoryInfo.usedJSHeapSize;
        cpuUsage = totalJSHeap > 0 ? (usedJSHeap / totalJSHeap) * 100 : 0;
      }
  
      let memoryUsage = 0;
      if ((performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        memoryUsage = parseFloat((memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2));
      }
  
      const avgFrameDuration =
        frameDurations.reduce((a, b) => a + b, 0) / frameDurations.length || 16.67;
      const fpsValue = 1000 / avgFrameDuration;
  
      const gpuUsageFromFPS = Math.max(
        0,
        Math.min(100, ((33.33 - avgFrameDuration) / 16.67) * 100)
      );
  
      const finalGpuUsage = ((gpuScore + gpuUsageFromFPS) / 2).toFixed(2);
  
      this.monitorService.logMetrics(cpuUsage, memoryUsage, fpsValue, Number(finalGpuUsage));
  
      this.memoryUsage = `${memoryUsage} MB`;
      this.cpuUsage = `${cpuUsage.toFixed(2)}%`;
      this.gpuUsage = `${finalGpuUsage}%`;
  
    }, 1000);
  }

  exportMetricsToCSV(): void {
    this.monitorService.exportToCSV();
  }

  startAddingPlanet() {
    this.isAddingPlanet = true;
    this.newPlanetData = {
      name: `Planet ${Math.floor(Math.random() * 1000)}`,
      color: this.getRandomColor().toString(),
      size: 0.2 + Math.random() * 0.5,
      semimajorAxis: 0,
      eccentricity: 0,
      axialTilt: Math.random() * 30
    };
    
    this.startAddingPlanetThree();
  }
  
  private getRandomColor(): number {
    return Math.floor(Math.random() * 0xffffff);
  }

  ngOnDestroy() {
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
    }
  }
}