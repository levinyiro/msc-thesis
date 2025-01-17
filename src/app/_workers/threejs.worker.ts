import { PlanetOrbitData } from "./models/objectData";

const insideWorker = require("offscreen-canvas/inside-worker");
const THREE = require('three');

insideWorker((event: any) => {
  if (event.data.canvas) {
    const canvas = event.data.canvas;
    const renderer = new THREE.WebGLRenderer({ canvas: canvas });
    renderer.setClearColor(0x111111);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.z = 100;
    camera.position.y = 20;
    camera.rotation.x = -0.3;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    let sun: any, earth: any, sunSpotLight: any, orbitPath: any, mercure: any, venus: any = null;
    let earthData: any, mercureData: any, venusData: any = null;
    let earthAngle = 0;
    let mercureAngle = 0;
    let venusAngle = 0;
    let showLines = true;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let yaw = 0, pitch = 0;
    let earthSpeed: number;
    let mercureSpeed: number;
    let venusSpeed: number;
    let moonSpeed: number;
    let orbitLines: any[] = [];
    let moon: any;
    let moonAngle = 0;
    const moonDistance = 2;

    const ANIMATION_SPEED = 0.0001;

    function addStars(count: number) {
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
    
        scene.add(star);
      }
    }
    
    function createOrbitLine(data: PlanetOrbitData): any {
      if (!data) return null;

      const perihelion = data.perihelion / 2000000;
      const aphelion = data.aphelion / 2000000;
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

      scene.add(orbitPath);
      orbitLines.push(orbitPath);
      return orbitPath;
    }

    function calculateSpeedFromVolatility(data: any, baseSpeed: number): number {
      const eccentricityFactor = data.eccentricity || 0;
      const massFactor = data.mass ? data.mass.massValue * Math.pow(10, data.mass.massExponent) : 1;

      const normalizedMass = Math.log10(massFactor) / 30;
      const normalizedEccentricity = eccentricityFactor;

      const volatility = normalizedMass + normalizedEccentricity;
      return baseSpeed * (0.5 + volatility * 1.5);
    }

    function getAxialTilt(degree: number) {
      return (degree || 0) * (Math.PI / 180);
    }

    if (showLines) {
      createOrbitLine(earthData);
      createOrbitLine(venusData);
      createOrbitLine(mercureData);
    }

    function animate() {
      if (sun) {
        sunSpotLight.position.copy(sun.position);
        sunSpotLight.target.position.set(earth.position.x, earth.position.y, earth.position.z);
        sunSpotLight.target.updateMatrixWorld();
      }

      if (earth) {
        earthAngle += earthSpeed;
        earth.rotation.y += 0.05;
        earth.position.x = Math.sin(earthAngle) * (earthData ? earthData.semimajorAxis / 2000000 : 8);
        earth.position.z = Math.cos(earthAngle) * (earthData ? earthData.semimajorAxis / 2000000 : 8);
      }

      if (mercure) {
        mercureAngle += mercureSpeed;
        mercure.rotation.y += 0.05;
        mercure.position.x = Math.sin(mercureAngle) * (mercureData ? mercureData.semimajorAxis / 2000000 : 8);
        mercure.position.z = Math.cos(mercureAngle) * (mercureData ? mercureData.semimajorAxis / 2000000 : 8);
      }

      if (venus) {
        venusAngle += venusSpeed;
        venus.rotation.y += 0.05;
        venus.position.x = Math.sin(venusAngle) * (venusData ? venusData.semimajorAxis / 2000000 : 8);
        venus.position.z = Math.cos(venusAngle) * (venusData ? venusData.semimajorAxis / 2000000 : 8);
      }

      if (moon && earth) {
        moonAngle += moonSpeed;
        moon.position.x = earth.position.x + Math.sin(moonAngle) * moonDistance;
        moon.position.z = earth.position.z + Math.cos(moonAngle) * moonDistance;
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    Promise.all([
      fetch('../assets/sun-texture.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/earth-texture.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/mercure-texture.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/venus-texture.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/moon-texture.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/universe-bg.jpg').then(response => response.blob()).then(createImageBitmap),
    ]) // TODO: képbetöltési hiba - lokálison van, canvas image betöltés - megoldás: await a képbetöltésre
      .then(([sunBitmap, earthBitmap, mercureBitmap, venusBitmap, moonBitmap, backgroundBitmap]) => {
        sunSpotLight = new THREE.SpotLight(0xe7c6ff, 6);
        sunSpotLight.castShadow = true;

        sunSpotLight.shadow.mapSize.width = 2056;
        sunSpotLight.shadow.mapSize.height = 2056;
        sunSpotLight.shadow.camera.near = 0.5;
        sunSpotLight.shadow.camera.far = 1000;
        sunSpotLight.shadow.penumbra = 0.5;
        sunSpotLight.shadow.focus = 1;

        sunSpotLight.position.set(0, 0, 0);
        sunSpotLight.angle = Math.PI / 6;
        sunSpotLight.penumbra = 0.2;
        sunSpotLight.decay = 2;
        sunSpotLight.distance = 1000;
        scene.add(sunSpotLight);
        sunSpotLight.target = new THREE.Object3D();
        scene.add(sunSpotLight.target);

        const sunTexture = new THREE.Texture(sunBitmap);
        sunTexture.needsUpdate = true;
        const sunGeometry = new THREE.SphereGeometry(3, 64, 32);
        const sunMaterial = new THREE.MeshPhongMaterial({
          map: sunTexture,
          emissive: 0x44fb8500,
          emissiveIntensity: 1.5,
        });
        sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.receiveShadow = false;
        scene.add(sun);

        // const backgroundGeometry = new THREE.SphereGeometry(500, 512, 512);

        // const backgroundTexture = new THREE.Texture(backgroundBitmap);
        // backgroundTexture.needsUpdate = true;
        
        // backgroundTexture.minFilter = THREE.LinearMipMapLinearFilter;
        // backgroundTexture.magFilter = THREE.LinearFilter;
        
        // backgroundTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        
        // const backgroundMaterial = new THREE.MeshBasicMaterial({
        //   map: backgroundTexture,
        //   side: THREE.BackSide,
        // });
        
        // const backgroundSphere = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        // scene.add(backgroundSphere);

        addStars(1000);

        const earthTexture = new THREE.Texture(earthBitmap);
        earthTexture.needsUpdate = true;
        earthTexture.wrapS = THREE.RepeatWrapping;
        earthTexture.wrapT = THREE.RepeatWrapping;
        earthTexture.repeat.set(1, -1);
        const earthGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const earthMaterial = new THREE.MeshPhongMaterial({ map: earthTexture });
        earth = new THREE.Mesh(earthGeometry, earthMaterial);
        earth.rotation.z = getAxialTilt(earthData?.axialTilt);
        earth.castShadow = true;
        earth.receiveShadow = true;
        scene.add(earth);

        const moonTexture = new THREE.Texture(moonBitmap);
        moonTexture.needsUpdate = true;
        moonTexture.wrapS = THREE.RepeatWrapping;
        moonTexture.wrapT = THREE.RepeatWrapping;
        moonTexture.repeat.set(1, -1);
        const moonGeometry = new THREE.SphereGeometry(0.1, 32, 32);
        const moonMaterial = new THREE.MeshPhongMaterial({ map: moonTexture });
        moon = new THREE.Mesh(moonGeometry, moonMaterial);
        
        moon.position.x = earth.position.x + moonDistance;
        moon.position.z = earth.position.z;
        moon.castShadow = true;
        moon.receiveShadow = true;
        scene.add(moon);

        const mercureTexture = new THREE.Texture(mercureBitmap);
        mercureTexture.needsUpdate = true;
        const mercureGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        const mercureMaterial = new THREE.MeshPhongMaterial({ map: mercureTexture });
        mercure = new THREE.Mesh(mercureGeometry, mercureMaterial);
        mercure.rotation.z = getAxialTilt(mercureData?.axialTilt);
        scene.add(mercure);

        const venusTexture = new THREE.Texture(venusBitmap);
        venusTexture.needsUpdate = true;
        const venusGeometry = new THREE.SphereGeometry(0.4, 32, 32);
        const venusMaterial = new THREE.MeshPhongMaterial({ map: venusTexture });
        venus = new THREE.Mesh(venusGeometry, venusMaterial);
        venus.rotation.z = getAxialTilt(venusData?.axialTilt);
        scene.add(venus);

        animate();
      })
      .catch(error => {
        console.error('Error loading textures:', error);
      });

    self.onmessage = function (event) {
      switch (event.data.type) {
        case 'mousedown':
          isDragging = true;
          previousMousePosition.x = event.data.mouseX;
          previousMousePosition.y = event.data.mouseY;
          break;
    
        case 'mouseup':
          isDragging = false;
          break;
    
        case 'mousemove':
          if (isDragging) {
            const deltaX = event.data.mouseX - previousMousePosition.x;
            const deltaY = event.data.mouseY - previousMousePosition.y;
            
            yaw -= deltaX * 0.001;            
            pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch - deltaY * 0.001));
    
            const radius = camera.position.distanceTo(sun.position);
            const x = radius * Math.cos(pitch) * Math.sin(yaw);
            const y = radius * Math.sin(pitch);
            const z = radius * Math.cos(pitch) * Math.cos(yaw);
    
            camera.position.set(sun.position.x + x, sun.position.y + y, sun.position.z + z);
            camera.lookAt(sun.position);
    
            previousMousePosition = { x: event.data.mouseX, y: event.data.mouseY };
          }
          break;

        case 'toggleLines':
          showLines = event.data.showLines;

          orbitLines.forEach((line) => scene.remove(line));
          orbitLines = [];

          if (showLines) {
            if (earthData) createOrbitLine(earthData);
            if (venusData) createOrbitLine(venusData);
            if (mercureData) createOrbitLine(mercureData);
          }
          break;

        case 'keydown':
          const step = 2;
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          if (event.data.key === 'ArrowUp') camera.position.addScaledVector(direction, step);
          if (event.data.key === 'ArrowDown') camera.position.addScaledVector(direction, -step);
          // if (event.data.key === 'ArrowLeft') camera.position.x -= step * Math.cos(yaw);
          // if (event.data.key === 'ArrowRight') camera.position.x += step * Math.cos(yaw);
          break;

        case 'mercureData':
          mercureData = event.data.mercureData as PlanetOrbitData;
          mercureData.color = 0xe7e8ec;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(mercureData);
          mercureSpeed = calculateSpeedFromVolatility(mercureData, ANIMATION_SPEED);
          console.log('Received mercureData:', mercureData);
          break;

        case 'venusData':
          venusData = event.data.venusData as PlanetOrbitData;
          venusData.color = 0xeecb8b;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(venusData);
          venusSpeed = calculateSpeedFromVolatility(venusData, ANIMATION_SPEED);
          console.log('Received venusData:', venusData);
          break;

        case 'earthData':
          earthData = event.data.earthData as PlanetOrbitData;
          earthData.color = 0x6b93d6;          
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(earthData);
          earthSpeed = calculateSpeedFromVolatility(earthData, ANIMATION_SPEED);
          moonSpeed = 0.005;
          console.log('Received earthData:', earthData);
          break;
      }
    };
  }
});
