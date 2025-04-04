import { log } from "console";
import { PlanetOrbitData } from "./models/objectData";

const insideWorker = require("offscreen-canvas/inside-worker");
const THREE = require('three');

insideWorker((event: any) => {
  if (event.data.canvas) {
    const canvas = event.data.canvas;
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x111111);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, canvas.width / canvas.height, 0.1, 1000);
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

    // add new planet
    let isAddingPlanet = false;
    let previewPlanet: any | null = null;
    let previewOrbit: any | null = null;
    const customPlanets: {
      mesh: any;
      angle: number;
      speed: number;
      data: PlanetOrbitData;
    }[] = [];

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

    async function loadTextures() {
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
        // { name: 'lensflareBitmap', url: '../assets/textures/lensflare.png' }
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

      customPlanets.forEach(planet => {
        planet.angle += planet.speed;
        const orbitRadius = planet.data.semimajorAxis! / distanceDivider;
        planet.mesh.position.x = Math.sin(planet.angle) * orbitRadius;
        planet.mesh.position.z = Math.cos(planet.angle) * orbitRadius;
        planet.mesh.rotation.y += 0.05;
      });

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    function createNewPlanet(data: PlanetOrbitData, position: any): any {
      const geometry = new THREE.SphereGeometry(data.size || 0.3, 32, 32);
      
      const material = new THREE.MeshPhongMaterial({
        color: data.color,
      });
    
      const planet = new THREE.Mesh(geometry, material);
      planet.position.copy(position);
      planet.rotation.z = getAxialTilt(data.axialTilt || 0);
      planet.castShadow = true;
      planet.receiveShadow = true;
    
      return planet;
    }

    function calculateOrbitDistance(position: any): number {
      return position.distanceTo(sun.position) * distanceDivider;
    }

    loadTextures().then(textures => {
      const { sunBitmap, earthBitmap, mercureBitmap, venusBitmap, marsBitmap, jupiterBitmap, saturnBitmap, uranusBitmap, neptuneBitmap, moonBitmap, lensflareBitmap } = textures;

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
      const sunGeometry = new THREE.SphereGeometry(2, 64, 32);
      const sunMaterial = new THREE.MeshPhongMaterial({
        map: sunTexture,
        emissive: 0x44fb8500,
        emissiveIntensity: 1.5,
      });
      sun = new THREE.Mesh(sunGeometry, sunMaterial);
      sun.receiveShadow = false;
      scene.add(sun);

      // TODO: Lensflare hozzáadása
      // const lensflareTexture = new THREE.Texture(lensflareBitmap);
      // lensflareTexture.needsUpdate = true;
      // const lensflare = new Lensflare();
      // lensflare.addElement(new LensflareElement(lensflareTexture, 512, 0));
      // sun.add(lensflare);

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
      }).catch(error => {
        console.error('Error loading textures:', error);
    });

    self.onmessage = function (event) {
      switch (event.data.type) {
        case 'mousedown':
          if (isAddingPlanet) {
            const position = previewPlanet?.position.clone() || new THREE.Vector3(10, 0, 0);
            const orbitDistance = calculateOrbitDistance(position);
            
            const colorNum = typeof event.data.planetData.color === 'string' 
              ? parseInt(event.data.planetData.color.replace('#', '0x')) 
              : 0xfff000;
            
            const newPlanetData: PlanetOrbitData = {
              semimajorAxis: orbitDistance,
              perihelion: orbitDistance,
              aphelion: orbitDistance,
              eccentricity: 0,
              color: colorNum,
              axialTilt: event.data.planetData.axialTilt || 0,
              size: event.data.planetData.size || 0.3,
              mass: { massValue: 1, massExponent: 24 }
            };
        
            const newPlanet = createNewPlanet(newPlanetData, position);
            scene.add(newPlanet);
            
            customPlanets.push({
              mesh: newPlanet,
              angle: Math.atan2(position.z, position.x),
              speed: calculateSpeedFromVolatility(newPlanetData, ANIMATION_SPEED),
              data: newPlanetData
            });
        
            if (previewPlanet) {
              scene.remove(previewPlanet);
              previewPlanet = null;
            }
            if (previewOrbit) {
              scene.remove(previewOrbit);
              previewOrbit = null;
            }
            
            if (showLines) {
              const permanentOrbit = createOrbitLine(newPlanetData);
              orbitLines.push(permanentOrbit);
            }
        
            isAddingPlanet = false;
          } else {
            
            isDragging = true;
            previousMousePosition.x = event.data.mouseX;
            previousMousePosition.y = event.data.mouseY;
          }
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
            } else if (isAddingPlanet && previewPlanet) {
              const mouseX = (event.data.mouseX / canvas.width) * 2 - 1;
              const mouseY = -(event.data.mouseY / canvas.height) * 2 + 1;
              
              const vector = new THREE.Vector3(mouseX, mouseY, 0.5);
              vector.unproject(camera);
              const dir = vector.sub(camera.position).normalize();
              const distance = -camera.position.y / dir.y;
              const pos = camera.position.clone().add(dir.multiplyScalar(distance));
              
              previewPlanet.position.copy(pos);
  
              if (previewOrbit) scene.remove(previewOrbit);
              
              const orbitData: PlanetOrbitData = {
                semimajorAxis: calculateOrbitDistance(pos),
                perihelion: calculateOrbitDistance(pos),
                aphelion: calculateOrbitDistance(pos),
                eccentricity: 0,
                color: 0xfff000,
                axialTilt: 0
              };
              
              if (previewOrbit) scene.remove(previewOrbit);
              previewOrbit = createOrbitLine(orbitData);
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
          marsData.color = 0x993d00;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(marsData);
          marsSpeed = calculateSpeedFromVolatility(marsData, ANIMATION_SPEED);
          console.log('Received marsData:', marsData);
          break;

        case 'jupiterData':
          jupiterData = event.data.jupiterData as PlanetOrbitData;
          jupiterData.color = 0xb07f35;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(jupiterData);
          jupiterSpeed = calculateSpeedFromVolatility(jupiterData, ANIMATION_SPEED);
          console.log('Received jupiterData:', jupiterData);
          break;

        case 'saturnData':
          saturnData = event.data.saturnData as PlanetOrbitData;
          saturnData.color = 0xb08f36;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(saturnData);
          saturnSpeed = calculateSpeedFromVolatility(saturnData, ANIMATION_SPEED);
          console.log('Received saturnData:', saturnData);
          break;

        case 'uranusData':
          uranusData = event.data.uranusData as PlanetOrbitData;
          uranusData.color = 0x5580aa;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(uranusData);
          uranusSpeed = calculateSpeedFromVolatility(uranusData, ANIMATION_SPEED);
          console.log('Received uranusData:', uranusData);
          break;

        case 'neptuneData':
          neptuneData = event.data.neptuneData as PlanetOrbitData;
          neptuneData.color = 0x366896;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(neptuneData);
          neptuneSpeed = calculateSpeedFromVolatility(neptuneData, ANIMATION_SPEED);
          console.log('Received neptuneData:', neptuneData);
          break;

          case 'startAddingPlanet':
            isAddingPlanet = true;
            
            const previewGeometry = new THREE.SphereGeometry(event.data.planetData.size, 32, 32);
            const previewMaterial = new THREE.MeshPhongMaterial({ 
              color: 0xfff000,
              transparent: true,
              opacity: 0.7
            });
            previewPlanet = new THREE.Mesh(previewGeometry, previewMaterial);
            scene.add(previewPlanet);
            break;
      }
    };
  }
});
