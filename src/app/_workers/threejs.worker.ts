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

    let sun: any, earth: any, sunSpotLight: any, orbitPath: any, mercure: any, venus: any = null, mars: any = null, jupiter: any = null, saturn: any = null, uranus: any = null, neptune: any = null;
    let earthData: any, mercureData: any, venusData: any = null, marsData: any = null, jupiterData: any = null, saturnData: any = null, uranusData: any = null, neptuneData: any = null;
    
    let earthAngle = 0;
    let mercureAngle = 0;
    let venusAngle = 0;
    let marsAngle = 0;
    let jupiterAngle = 0;
    let saturnAngle = 0;
    let uranusAngle = 0;
    let neptuneAngle = 0;

    let showLines = true;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let yaw = 0, pitch = 0;
    let earthSpeed: number;
    let mercureSpeed: number;
    let venusSpeed: number;
    let moonSpeed: number;
    let marsSpeed: number;
    let jupiterSpeed: number;
    let saturnSpeed: number;
    let uranusSpeed: number;
    let neptuneSpeed: number;
    let orbitLines: any[] = [];
    let moon: any;
    let moonAngle = 0;
    const moonDistance = 2;
    const distanceDivider = 5000000;

    // fps counting
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let fps = 0;

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

      const perihelion = data.perihelion / distanceDivider;
      const aphelion = data.aphelion / distanceDivider;
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
      createOrbitLine(marsData);
      createOrbitLine(jupiterData);
      createOrbitLine(saturnData);
      createOrbitLine(uranusData);
      createOrbitLine(neptuneData);
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
        earth.position.x = Math.sin(earthAngle) * (earthData ? earthData.semimajorAxis / distanceDivider : 8);
        earth.position.z = Math.cos(earthAngle) * (earthData ? earthData.semimajorAxis / distanceDivider : 8);
      }

      if (mercure) {
        mercureAngle += mercureSpeed;
        mercure.rotation.y += 0.05;
        mercure.position.x = Math.sin(mercureAngle) * (mercureData ? mercureData.semimajorAxis / distanceDivider : 8);
        mercure.position.z = Math.cos(mercureAngle) * (mercureData ? mercureData.semimajorAxis / distanceDivider : 8);
      }

      if (venus) {
        venusAngle += venusSpeed;
        venus.rotation.y += 0.05;
        venus.position.x = Math.sin(venusAngle) * (venusData ? venusData.semimajorAxis / distanceDivider : 8);
        venus.position.z = Math.cos(venusAngle) * (venusData ? venusData.semimajorAxis / distanceDivider : 8);
      }

      if (moon && earth) {
        moonAngle += moonSpeed;
        moon.position.x = earth.position.x + Math.sin(moonAngle) * moonDistance;
        moon.position.z = earth.position.z + Math.cos(moonAngle) * moonDistance;
      }

      if (mars) {
        marsAngle += marsSpeed;
        mars.rotation.y += 0.05;
        mars.position.x = Math.sin(marsAngle) * (marsData ? marsData.semimajorAxis / distanceDivider : 8);
        mars.position.z = Math.cos(marsAngle) * (marsData ? marsData.semimajorAxis / distanceDivider : 8);
      }

      if (jupiter) {
        jupiterAngle += jupiterSpeed;
        jupiter.rotation.y += 0.05;
        jupiter.position.x = Math.sin(jupiterAngle) * (jupiterData ? jupiterData.semimajorAxis / distanceDivider : 8);
        jupiter.position.z = Math.cos(jupiterAngle) * (jupiterData ? jupiterData.semimajorAxis / distanceDivider : 8);
      }

      if (saturn) {
        saturnAngle += saturnSpeed;
        saturn.rotation.y += 0.05;
        saturn.position.x = Math.sin(saturnAngle) * (saturnData ? saturnData.semimajorAxis / distanceDivider : 8);
        saturn.position.z = Math.cos(saturnAngle) * (saturnData ? saturnData.semimajorAxis / distanceDivider : 8);
      }

      if (uranus) {
        uranusAngle += uranusSpeed;
        uranus.rotation.y += 0.05;
        uranus.position.x = Math.sin(uranusAngle) * (uranusData ? uranusData.semimajorAxis / distanceDivider : 8);
        uranus.position.z = Math.cos(uranusAngle) * (uranusData ? uranusData.semimajorAxis / distanceDivider : 8);
      }

      if (neptune) {
        neptuneAngle += neptuneSpeed;
        neptune.rotation.y += 0.05;
        neptune.position.x = Math.sin(neptuneAngle) * (neptuneData ? neptuneData.semimajorAxis / distanceDivider : 8);
        neptune.position.z = Math.cos(neptuneAngle) * (neptuneData ? neptuneData.semimajorAxis / distanceDivider : 8);
      }

      // fps counting
      const now = performance.now();
      frameCount++;
    
      if (now - lastFpsUpdate >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsUpdate = now;
        postMessage({ type: 'fps', fps: fps });
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    Promise.all([
      fetch('../assets/textures/sun.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/textures/earth.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/textures/mercure.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/textures/venus.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/textures/mars.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/textures/jupiter.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/textures/saturn.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/textures/uranus.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/textures/neptune.jpg').then(response => response.blob()).then(createImageBitmap),
      fetch('../assets/textures/moon.jpg').then(response => response.blob()).then(createImageBitmap),
    ]) // TODO: képbetöltési hiba - lokálison van, canvas image betöltés - megoldás: await a képbetöltésre
      .then(([
        sunBitmap,
        earthBitmap,
        mercureBitmap,
        venusBitmap,
        marsBitmap,
        jupiterBitmap,
        saturnBitmap,
        uranusBitmap,
        neptuneBitmap,
        moonBitmap]) => {
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

        const marsTexture = new THREE.Texture(marsBitmap);
        marsTexture.needsUpdate = true;
        const marsGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        const marsMaterial = new THREE.MeshPhongMaterial({ map: marsTexture });
        mars = new THREE.Mesh(marsGeometry, marsMaterial);
        mars.rotation.z = getAxialTilt(marsData?.axialTilt);
        scene.add(mars);

        const jupiterTexture = new THREE.Texture(jupiterBitmap);
        jupiterTexture.needsUpdate = true;
        const jupiterGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        const jupiterMaterial = new THREE.MeshPhongMaterial({ map: jupiterTexture });
        jupiter = new THREE.Mesh(jupiterGeometry, jupiterMaterial);
        jupiter.rotation.z = getAxialTilt(jupiterData?.axialTilt);
        scene.add(jupiter);

        const saturnTexture = new THREE.Texture(saturnBitmap);
        saturnTexture.needsUpdate = true;
        const saturnGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        const saturnMaterial = new THREE.MeshPhongMaterial({ map: saturnTexture });
        saturn = new THREE.Mesh(saturnGeometry, saturnMaterial);
        saturn.rotation.z = getAxialTilt(saturnData?.axialTilt);
        scene.add(saturn);

        const uranusTexture = new THREE.Texture(uranusBitmap);
        uranusTexture.needsUpdate = true;
        const uranusGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        const uranusMaterial = new THREE.MeshPhongMaterial({ map: uranusTexture });
        uranus = new THREE.Mesh(uranusGeometry, uranusMaterial);
        uranus.rotation.z = getAxialTilt(uranusData?.axialTilt);
        scene.add(uranus);

        const neptuneTexture = new THREE.Texture(neptuneBitmap);
        neptuneTexture.needsUpdate = true;
        const neptuneGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        const neptuneMaterial = new THREE.MeshPhongMaterial({ map: neptuneTexture });
        neptune = new THREE.Mesh(neptuneGeometry, neptuneMaterial);
        neptune.rotation.z = getAxialTilt(neptuneData?.axialTilt);
        scene.add(neptune);

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
            if (marsData) createOrbitLine(marsData);
            if (jupiterData) createOrbitLine(jupiterData);
            if (saturnData) createOrbitLine(saturnData);
            if (uranusData) createOrbitLine(uranusData);
            if (neptuneData) createOrbitLine(neptuneData);
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

        case 'marsData':
          marsData = event.data.marsData as PlanetOrbitData;
          marsData.color = 0xe7e8ec;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(marsData);
          marsSpeed = calculateSpeedFromVolatility(marsData, ANIMATION_SPEED);
          console.log('Received marsData:', marsData);
          break;

        case 'jupiterData':
          jupiterData = event.data.jupiterData as PlanetOrbitData;
          jupiterData.color = 0xe7e8ec;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(jupiterData);
          jupiterSpeed = calculateSpeedFromVolatility(jupiterData, ANIMATION_SPEED);
          console.log('Received jupiterData:', jupiterData);
          break;

        case 'saturnData':
          saturnData = event.data.saturnData as PlanetOrbitData;
          saturnData.color = 0xe7e8ec;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(saturnData);
          saturnSpeed = calculateSpeedFromVolatility(saturnData, ANIMATION_SPEED);
          console.log('Received saturnData:', saturnData);
          break;

        case 'uranusData':
          uranusData = event.data.uranusData as PlanetOrbitData;
          uranusData.color = 0xe7e8ec;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(uranusData);
          uranusSpeed = calculateSpeedFromVolatility(uranusData, ANIMATION_SPEED);
          console.log('Received uranusData:', uranusData);
          break;

        case 'neptuneData':
          neptuneData = event.data.neptuneData as PlanetOrbitData;
          neptuneData.color = 0xe7e8ec;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(neptuneData);
          neptuneSpeed = calculateSpeedFromVolatility(neptuneData, ANIMATION_SPEED);
          console.log('Received neptuneData:', neptuneData);
          break;
      }
    };
  }
});
