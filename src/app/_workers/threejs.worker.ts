import { Planet } from "../models/planet";

const insideWorker = require("offscreen-canvas/inside-worker");
const THREE = require('three');

insideWorker((event: any) => {
  if (event.data.canvas) {
    // basic settings
    const canvas = event.data.canvas;
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x111111);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();

    // camera settings
    const camera = new THREE.PerspectiveCamera(30, canvas.width / canvas.height, 0.1, 1000);
    camera.position.z = 200;
    camera.position.y = 40;
    camera.rotation.x = -0.3;
    let yaw = 0, pitch = 0;
    let previousMousePosition = { x: 0, y: 0 };

    // light settings
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    // basic planets
    let sun: any;
    let moon: Planet = {data: {distance: 2, speed: 0.005, angle: 0}};
    
    // fps counting
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let fps = 0;
    
    // add new planet
    let isAddingPlanet = false;
    let previewPlanet: any | null = null;
    let previewOrbit: any | null = null;

    // planets list
    let planets: Planet[] = [];

    // general settings
    let showLines = true;
    let isDragging = false;
    let targetObject: any;
    let cameraTargetPosition = new THREE.Vector3().copy(camera.position);
    const DISTANCE_DIVIDER = 3000000;
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

    function createOrbitLine(planet: Planet): any {
      if (!planet) return null;
    
      const semiMajorAxis = planet.data!.semimajorAxis! / DISTANCE_DIVIDER;
      const eccentricity = planet.data!.eccentricity || 0;
      const focalDistance = semiMajorAxis * eccentricity;
      
      const points = [];
      const segments = 100;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) / 
                  (1 + eccentricity * Math.cos(angle));
        const x = r * Math.cos(angle) - focalDistance;
        const z = r * Math.sin(angle);
        points.push(new THREE.Vector3(x, 0, z));
      }
    
      const orbitPathGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const orbitPathMaterial = new THREE.LineBasicMaterial({ color: planet.data!.color });
      const orbitPath = new THREE.Line(orbitPathGeometry, orbitPathMaterial);
            
      orbitPath.name = planet.data!.name?.toLowerCase().replace(' ', '') + 'Orbit';
          
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

    async function loadTextures() {
      const textureUrls = [
        { name: 'sunBitmap', url: '../assets/textures/sun.jpg' },
        { name: 'earthBitmap', url: '../assets/textures/earth.jpg' },
        { name: 'mercuryBitmap', url: '../assets/textures/mercury.jpg' },
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

    async function loadTextureWithFetch(path: string): Promise<any> {
      const response = await fetch(path);
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);

      const texture = new THREE.Texture(imageBitmap);
      texture.needsUpdate = true;

      return texture;
    }

    function getGlow(bitmap: any, size: number) {
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

    function createPlanetSpotlight(name: string): any {
      const light = new THREE.SpotLight(0xffffff, 0.7);
      light.castShadow = true;
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 1000;
      light.angle = Math.PI / 8;
      light.penumbra = 0.5;
      light.decay = 2;
      light.distance = 1000;
      light.name = name.replace(' ', '').toLowerCase() + 'SpotLight';
      light.position.copy(sun.position);
      return light;
    }

    function getInitialAngle(planet: Planet, date: Date): number {
      const T = planet.data!.sideralOrbit!;
      const n = 2 * Math.PI / T;
      const J2000 = new Date('2000-01-01T12:00:00Z');

      const daysSinceEpoch = (date.getTime() - J2000.getTime()) / (1000 * 60 * 60 * 24);
      const M = n * daysSinceEpoch;

      return M % (2 * Math.PI);
    }

    function getPlanetByName(name: string): any {      
      return planets.find(x => x.data!.name!.toLowerCase() === name);
    }

    function createNewPlanet(planet: Planet, position: any, texture: any): any {
      const geometry = new THREE.SphereGeometry(planet.data!.size || 0.3, 32, 32);

      const material = new THREE.MeshPhongMaterial({
        map: texture,
      });

      planet.mesh = new THREE.Mesh(geometry, material);
      planet.mesh.angle = planet.data!.angle || 0;
      planet.mesh.position.copy(position);
      planet.mesh.rotation.z = getAxialTilt(planet.data!.axialTilt || 0);
      planet.mesh.castShadow = true;
      planet.mesh.receiveShadow = true;
      
      planet.mesh.name = planet.data!.name?.toLowerCase().replace(' ', '');

      return planet;
    }

    function calculateOrbitDistance(position: any): number {
      return position.distanceTo(sun.position) * DISTANCE_DIVIDER;
    }

    function estimateAvgTemperature(distance: number) {
      // 57475497.740633406 - 167 Celsius degree
      // 149339835.22790316 - 15 Celsius degree
      // 226914680.29744518 - -63 Celsius degree

      const x1 = 57475497.740633406;
      const y1 = 167;
      const x2 = 149339835.22790316;
      const y2 = 15;
      const x3 = 226914680.29744518;
      const y3 = -63;

      const denom = (x1 - x2) * (x1 - x3) * (x2 - x3);

      const a = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / denom;
      const b = (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) / denom;
      const c = (x2 * x3 * (x2 - x3) * y1 + x3 * x1 * (x3 - x1) * y2 + x1 * x2 * (x1 - x2) * y3) / denom;

      return a * distance * distance + b * distance + c;
    }

    function changeTargetPlanet(intersected: string) {
      const currentDistance = camera.position.distanceTo(targetObject.position);
      targetObject = intersected;
      const direction = new THREE.Vector3()
        .subVectors(camera.position, targetObject.position)
        .normalize();

      const newCameraPosition = targetObject.position.clone()
        .addScaledVector(direction, currentDistance);

      cameraTargetPosition.copy(newCameraPosition);
    }

    function setPlanetPosition(planet: Planet) {
      if (!planet.data) return;

      planet.mesh.angle -= planet.data.speed!;
      planet.mesh.rotation.y += 0.05;

      const semiMajorAxis = planet.data.semimajorAxis! / DISTANCE_DIVIDER;
      const eccentricity = planet.data.eccentricity || 0;
      const focalDistance = semiMajorAxis * eccentricity;

      const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) /
        (1 + eccentricity * Math.cos(planet.mesh.angle));

      planet.mesh.position.x = r * Math.cos(planet.mesh.angle) - focalDistance;
      planet.mesh.position.z = r * Math.sin(planet.mesh.angle);
    }

    loadTextures().then(textures => {
      const { sunBitmap, earthBitmap, mercuryBitmap, venusBitmap, marsBitmap, jupiterBitmap, saturnBitmap, uranusBitmap, neptuneBitmap, moonBitmap, lensflareBitmap } = textures;

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
      sun.name = 'sun';
      scene.add(sun);
      targetObject = sun;

      // lensflare
      sun.add(getGlow(lensflareBitmap, 10));

      addStars(1000);

      // earth mesh
      const earthTexture = new THREE.Texture(earthBitmap);
      earthTexture.needsUpdate = true;
      earthTexture.wrapS = THREE.RepeatWrapping;
      earthTexture.wrapT = THREE.RepeatWrapping;
      earthTexture.repeat.set(1, -1);
      const earthGeometry = new THREE.SphereGeometry(0.5, 32, 32);
      const earthMaterial = new THREE.MeshPhongMaterial({ map: earthTexture });
      const earth: Planet = getPlanetByName('earth');
      
      earth.mesh = new THREE.Mesh(earthGeometry, earthMaterial);
      earth.mesh.rotation.z = getAxialTilt(earth.data?.axialTilt!);
      earth.mesh.castShadow = true;
      earth.mesh.receiveShadow = true;
      earth.mesh.name = 'earth';
      const earthSpotLight = createPlanetSpotlight(earth.mesh.name);
      earthSpotLight.target = earth.mesh;
      scene.add(earthSpotLight);
      earth.spotLight = earthSpotLight;
      earth.mesh.angle = getInitialAngle(earth, new Date());
      scene.add(earth.mesh);

      const moonTexture = new THREE.Texture(moonBitmap);
      moonTexture.needsUpdate = true;
      moonTexture.wrapS = THREE.RepeatWrapping;
      moonTexture.wrapT = THREE.RepeatWrapping;
      moonTexture.repeat.set(1, -1);
      const moonGeometry = new THREE.SphereGeometry(0.1, 32, 32);
      const moonMaterial = new THREE.MeshPhongMaterial({ map: moonTexture });
      moon.mesh = new THREE.Mesh(moonGeometry, moonMaterial);
      moon.mesh.position.x = earth.mesh.position.x + moon.data!.distance;
      moon.mesh.position.z = earth.mesh.position.z;
      moon.mesh.castShadow = true;
      moon.mesh.receiveShadow = true;
      moon.mesh.name = 'moon';
      moon.mesh.angle = moon.data!.angle;
      scene.add(moon.mesh);

      const moonSpotLight = createPlanetSpotlight(moon.mesh.name);
      moonSpotLight.target = moon.mesh;
      scene.add(moonSpotLight);
      moon.spotLight = moonSpotLight;

      // mercury mesh
      const mercuryTexture = new THREE.Texture(mercuryBitmap);
      mercuryTexture.needsUpdate = true;
      const mercuryGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const mercuryMaterial = new THREE.MeshPhongMaterial({ map: mercuryTexture });
      const mercury: Planet = getPlanetByName('mercury');
      mercury.mesh = new THREE.Mesh(mercuryGeometry, mercuryMaterial);
      mercury.mesh.rotation.z = getAxialTilt(mercury.data?.axialTilt!);
      mercury.mesh.name = 'mercury';
      mercury.mesh.angle = getInitialAngle(mercury, new Date());
      scene.add(mercury.mesh);
      const mercurySpotLight = createPlanetSpotlight(mercury.mesh.name);
      mercurySpotLight.target = mercury.mesh;
      scene.add(mercurySpotLight);
      mercury.spotLight = mercurySpotLight;

      // venus mesh
      const venusTexture = new THREE.Texture(venusBitmap);
      venusTexture.needsUpdate = true;
      const venusGeometry = new THREE.SphereGeometry(0.4, 32, 32);
      const venusMaterial = new THREE.MeshPhongMaterial({ map: venusTexture });
      const venus: Planet = getPlanetByName('venus');
      venus.mesh = new THREE.Mesh(venusGeometry, venusMaterial);
      venus.mesh.rotation.z = getAxialTilt(venus.data?.axialTilt!);
      venus.mesh.name = 'venus';
      venus.mesh.angle = getInitialAngle(venus, new Date());
      scene.add(venus.mesh);
      const venusSpotLight = createPlanetSpotlight(venus.mesh.name);
      venusSpotLight.target = venus.mesh;
      scene.add(venusSpotLight);
      venus.spotLight = venusSpotLight;

      const marsTexture = new THREE.Texture(marsBitmap);
      marsTexture.needsUpdate = true;
      const marsGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const marsMaterial = new THREE.MeshPhongMaterial({ map: marsTexture });
      const mars: Planet = getPlanetByName('mars');
      mars.mesh = new THREE.Mesh(marsGeometry, marsMaterial);
      mars.mesh.rotation.z = getAxialTilt(mars.data?.axialTilt!);
      mars.mesh.name = 'mars';
      mars.mesh.angle = getInitialAngle(mars, new Date());
      scene.add(mars.mesh);
      const marsSpotLight = createPlanetSpotlight(mars.mesh.name);
      marsSpotLight.target = mars.mesh;
      scene.add(marsSpotLight);
      mars.spotLight = marsSpotLight;

      const jupiterTexture = new THREE.Texture(jupiterBitmap);
      jupiterTexture.needsUpdate = true;
      const jupiterGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const jupiterMaterial = new THREE.MeshPhongMaterial({ map: jupiterTexture });
      const jupiter: Planet = getPlanetByName('jupiter');
      jupiter.mesh = new THREE.Mesh(jupiterGeometry, jupiterMaterial);
      jupiter.mesh.rotation.z = getAxialTilt(jupiter.data?.axialTilt!);
      jupiter.mesh.name = 'jupiter';
      jupiter.mesh.angle = getInitialAngle(jupiter, new Date());
      scene.add(jupiter.mesh);
      const jupiterSpotLight = createPlanetSpotlight(jupiter.mesh.name);
      jupiterSpotLight.target = jupiter.mesh;
      scene.add(jupiterSpotLight);
      jupiter.spotLight = jupiterSpotLight;

      const saturnTexture = new THREE.Texture(saturnBitmap);
      saturnTexture.needsUpdate = true;
      const saturnGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const saturnMaterial = new THREE.MeshPhongMaterial({ map: saturnTexture });
      const saturn: Planet = getPlanetByName('saturn');
      saturn.mesh = new THREE.Mesh(saturnGeometry, saturnMaterial);
      saturn.mesh.rotation.z = getAxialTilt(saturn.data?.axialTilt!);
      saturn.mesh.name = 'saturn';
      saturn.mesh.angle = getInitialAngle(saturn, new Date());
      scene.add(saturn.mesh);
      const saturnSpotLight = createPlanetSpotlight(saturn.mesh.name);
      saturnSpotLight.target = saturn.mesh;
      scene.add(saturnSpotLight);
      saturn.spotLight = saturnSpotLight;

      const uranusTexture = new THREE.Texture(uranusBitmap);
      uranusTexture.needsUpdate = true;
      const uranusGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const uranusMaterial = new THREE.MeshPhongMaterial({ map: uranusTexture });
      const uranus: Planet = getPlanetByName('uranus');
      uranus.mesh = new THREE.Mesh(uranusGeometry, uranusMaterial);
      uranus.mesh.rotation.z = getAxialTilt(uranus.data?.axialTilt!);
      uranus.mesh.name = 'uranus'
      uranus.mesh.angle = getInitialAngle(uranus, new Date());
      scene.add(uranus.mesh);
      const uranusSpotLight = createPlanetSpotlight(uranus.mesh.name);
      uranusSpotLight.target = uranus.mesh;
      scene.add(uranusSpotLight);
      uranus.spotLight = uranusSpotLight;

      const neptuneTexture = new THREE.Texture(neptuneBitmap);
      neptuneTexture.needsUpdate = true;
      const neptuneGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const neptuneMaterial = new THREE.MeshPhongMaterial({ map: neptuneTexture });
      const neptune: Planet = getPlanetByName('neptune');
      neptune.mesh = new THREE.Mesh(neptuneGeometry, neptuneMaterial);
      neptune.mesh.rotation.z = getAxialTilt(neptune.data?.axialTilt!);
      neptune.mesh.name = 'neptune'
      neptune.mesh.angle = getInitialAngle(neptune, new Date());
      scene.add(neptune.mesh);
      const neptuneSpotLight = createPlanetSpotlight(neptune.mesh.name);
      neptuneSpotLight.target = neptune.mesh;
      scene.add(neptuneSpotLight);
      neptune.spotLight = neptuneSpotLight;

      // show orbitLines
      if (showLines) {        
        planets.map(planet => planet.orbitLine).forEach(orbitLine => {
          scene.add(orbitLine);
        })
      }

      animate();
    }).catch(error => {
      console.error('Error loading textures:', error);
    });

    function animate() {
      const earth = getPlanetByName('earth');
      if (earth && moon) {
        moon.mesh.angle += moon.data!.speed;
        moon.mesh.position.x = earth.mesh.position.x + Math.sin(moon.mesh.angle) * moon.data!.distance!;
        moon.mesh.position.z = earth.mesh.position.z + Math.cos(moon.mesh.angle) * moon.data!.distance!;
      }

      // fps counting
      const nowFps = performance.now();
      frameCount++;

      if (nowFps - lastFpsUpdate >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsUpdate = nowFps;
        postMessage({ type: 'fps', fps: fps });
      }

      planets.forEach(planet => {
        setPlanetPosition(planet);
      });


      if (targetObject) {
        camera.lookAt(targetObject.position);
      }

      camera.position.lerp(cameraTargetPosition, 0.05);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    self.onmessage = function (event) {
      switch (event.data.type) {
        case 'mousedown':
          if (!camera || !scene) return;

          const { mouseX, mouseY, canvasWidth, canvasHeight } = event.data;

          const raycaster = new THREE.Raycaster();
          const mouse = new THREE.Vector2(
            (mouseX / canvasWidth) * 2 - 1,
            -(mouseY / canvasHeight) * 2 + 1
          );

          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(scene.children, true);

          if (intersects.length > 0) {
            const intersected = intersects[0].object;

            if (!intersected.name.includes('Orbit')) {
              changeTargetPlanet(intersected);
            }
          }

          if (isAddingPlanet) {
            let planet: Planet = {};
            planet.data = event.data.planetData;
            // planet.data = event.data.planetData;            
            
            const position = previewPlanet?.position.clone() ?? new THREE.Vector3(10, 0, 0);
            const orbitDistance = calculateOrbitDistance(position);

            planet.data!.color = typeof planet.data!.color === 'string'
              ? parseInt(planet.data!.color.replace('#', '0x'))
              : typeof planet.data!.color === 'number'
                ? planet.data!.color
                : 0xfff000;

            planet.data!.semimajorAxis = orbitDistance;
            planet.data!.perihelion = orbitDistance;
            planet.data!.aphelion = orbitDistance;
            planet.data!.eccentricity ??= 0;
            planet.data!.axialTilt ??= 0;
            planet.data!.size ??= 0.3;
            planet.data!.mass = {
              massValue: 1,
              massExponent: 24
            };

            planet.data!.angle = Math.atan2(position.z, position.x);
            planet.data!.speed = calculateSpeedFromVolatility(planet.data!, ANIMATION_SPEED);

            const estimatedTemperature = estimateAvgTemperature(calculateOrbitDistance(position));
            let texturePath = '';

            if (estimatedTemperature > 100) {
              texturePath = '../assets/textures/exoplanets/red.jpg';
            } else if (estimatedTemperature > 20) {
              texturePath = '../assets/textures/exoplanets/blue-green.jpg';
            } else if (estimatedTemperature > 0) {
              texturePath = '../assets/textures/exoplanets/green.jpg';
            } else {
              texturePath = '../assets/textures/exoplanets/gray.jpg';
            }

            loadTextureWithFetch(texturePath).then((texture) => {
              const newPlanet: Planet = createNewPlanet(planet, position, texture);
              newPlanet.data = planet.data;              
              scene.add(newPlanet.mesh);
              
              const newPlanetSpotLight = createPlanetSpotlight(newPlanet.mesh.name);
              newPlanetSpotLight.target = newPlanet.mesh;
              scene.add(newPlanetSpotLight);
              newPlanet.spotLight = newPlanetSpotLight;

              planets.push(newPlanet);

              if (previewPlanet) {
                scene.remove(previewPlanet);
                previewPlanet = null;
              }
              if (previewOrbit) {
                scene.remove(previewOrbit);
                previewOrbit = null;
              }
              isAddingPlanet = false;

              const permanentOrbit = createOrbitLine(newPlanet);
              permanentOrbit.name = newPlanet.data!.name!.toLowerCase().replace(' ', '') + 'Orbit';
              newPlanet.orbitLine = permanentOrbit;
              
              if (showLines) {
                scene.add(permanentOrbit);
              }
            });
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

            yaw -= deltaX * 0.002;
            pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch - deltaY * 0.002));

            const radius = camera.position.distanceTo(targetObject.position);
            const x = radius * Math.cos(pitch) * Math.sin(yaw);
            const y = radius * Math.sin(pitch);
            const z = radius * Math.cos(pitch) * Math.cos(yaw);

            cameraTargetPosition.set(
              targetObject.position.x + x,
              targetObject.position.y + y,
              targetObject.position.z + z
            );

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

            const orbitData: Planet = {data: {
              semimajorAxis: calculateOrbitDistance(pos),
              perihelion: calculateOrbitDistance(pos),
              aphelion: calculateOrbitDistance(pos),
              eccentricity: 0,
              color: 0xfff000,
              axialTilt: 0
            }};

            if (previewOrbit) scene.remove(previewOrbit);
            previewOrbit = createOrbitLine(orbitData);
            scene.add(previewOrbit);
          }
          break;

        case 'toggleLines':
          showLines = event.data.showLines;
          
          planets.map(planet => planet.orbitLine).forEach(orbitLine => {
            showLines ? scene.add(orbitLine) : scene.remove(orbitLine);
          });

          break;

        // case 'update_canvas':
        //   const { rect, devicePixelRatio } = event.data;

        //   const previousTarget = targetObject?.position.clone() || new THREE.Vector3();
        //   const previousDistance = camera.position.distanceTo(previousTarget);
        //   const previousFov = camera.fov;

        //   canvas.width = Math.floor(rect.width * devicePixelRatio);
        //   canvas.height = Math.floor(rect.height * devicePixelRatio);

        //   if (camera && renderer) {
        //       camera.aspect = rect.width / rect.height;

        //       camera.fov = previousFov;
        //       camera.updateProjectionMatrix();

        //       renderer.setSize(rect.width, rect.height, false);
        //       renderer.setPixelRatio(devicePixelRatio);

        //       if (targetObject) {
        //           const radius = previousDistance;
        //           const x = radius * Math.cos(pitch) * Math.sin(yaw);
        //           const y = radius * Math.sin(pitch);
        //           const z = radius * Math.cos(pitch) * Math.cos(yaw);

        //           camera.position.set(
        //               targetObject.position.x + x,
        //               targetObject.position.y + y,
        //               targetObject.position.z + z
        //           );
        //           camera.lookAt(targetObject.position);

        //           renderer.render(scene, camera);
        //       }
        //   }
        //   break;

        case 'keydown':
          const step = 2;
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);

          if (event.data.key === 'ArrowUp') {
            cameraTargetPosition.addScaledVector(direction, step);
          }

          if (event.data.key === 'ArrowDown') {
            cameraTargetPosition.addScaledVector(direction, -step);
          }

          break;

        case 'mercuryData':
          const mercury: any = {};
          
          mercury.data = event.data.mercuryData as Planet;
          mercury.data.color = 0xe7e8ec;
          mercury.orbitLine = createOrbitLine(mercury);
          mercury.data.speed = calculateSpeedFromVolatility(mercury, ANIMATION_SPEED);
          planets.push(mercury);
          break;

        case 'venusData':
          const venus: any = {};
          venus.data = event.data.venusData as Planet;
          venus.data.color = 0xeecb8b;
          venus.orbitLine = createOrbitLine(venus);
          venus.data.speed = calculateSpeedFromVolatility(venus, ANIMATION_SPEED);
          planets.push(venus)
          break;

        case 'earthData':
          const earth: any = {};
          earth.data = event.data.earthData as Planet;
          earth.data.color = 0x6b93d6;
          earth.orbitLine = createOrbitLine(earth);
          earth.data.speed = calculateSpeedFromVolatility(earth, ANIMATION_SPEED);
          planets.push(earth);
          break;

        case 'marsData':
          const mars: any = {};
          mars.data = event.data.marsData as Planet;
          mars.data.color = 0x993d00;
          mars.orbitLine = createOrbitLine(mars);
          mars.data.speed = calculateSpeedFromVolatility(mars, ANIMATION_SPEED);
          planets.push(mars);
          break;

        case 'jupiterData':
          const jupiter: any = {};
          jupiter.data = event.data.jupiterData as Planet;
          jupiter.data.color = 0xb07f35;
          jupiter.orbitLine = createOrbitLine(jupiter);
          jupiter.data.speed = calculateSpeedFromVolatility(jupiter, ANIMATION_SPEED);
          planets.push(jupiter);
          break;

        case 'saturnData':
          const saturn: any = {};
          saturn.data = event.data.saturnData as Planet;
          saturn.data.color = 0xb08f36;
          saturn.orbitLine = createOrbitLine(saturn);
          saturn.data.speed = calculateSpeedFromVolatility(saturn, ANIMATION_SPEED);
          planets.push(saturn);
          break;

        case 'uranusData':
          const uranus: any = {};
          uranus.data = event.data.uranusData as Planet;
          uranus.data.color = 0x5580aa;
          uranus.orbitLine = createOrbitLine(uranus);
          uranus.data.speed = calculateSpeedFromVolatility(uranus, ANIMATION_SPEED);
          planets.push(uranus);
          break;

        case 'neptuneData':
          const neptune: any = {};
          neptune.data = event.data.neptuneData as Planet;
          neptune.data.color = 0x366896;
          neptune.orbitLine = createOrbitLine(neptune);
          neptune.data.speed = calculateSpeedFromVolatility(neptune, ANIMATION_SPEED);
          planets.push(neptune);
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

        case 'deletePlanet':
          const planetName = event.data.planetName.toLowerCase().replace(' ', '');
          const orbitName = planetName + 'Orbit';

          if (targetObject.name === planetName) {
            changeTargetPlanet(sun);
          }

          const deleteObjectByName = (name: string) => {
            const object = scene.getObjectByName(name);
            if (object) {
              scene.remove(object);

              if ((object as any).geometry) (object as any).geometry.dispose();

              const material = (object as any).material;
              if (Array.isArray(material)) {
                material.forEach(m => {
                  if ((m as any).map) (m as any).map.dispose();
                  m.dispose();
                });
              } else if (material) {
                if ((material as any).map) (material as any).map.dispose();
                material.dispose();
              }
            }
          };

          deleteObjectByName(planetName);
          deleteObjectByName(orbitName);

          planets = planets.filter(p => p.mesh.name !== planetName);          
          
          const planetSpotLight = scene.getObjectByName(`${planetName}SpotLight`);
          if (planetSpotLight) {
            scene.remove(planetSpotLight);
            if (planetSpotLight.target) scene.remove(planetSpotLight.target);
            planetSpotLight.dispose();
          }

          if (planetName === 'earth') {
            deleteObjectByName('moon');
          }

          break;

        case 'followPlanet':
          const followPlanetName = event.data.planetName.toLowerCase().replace(' ', '');
          const object = scene.getObjectByName(followPlanetName);
          if (object) {
            changeTargetPlanet(object);
          }

          break;
      }
    };
  }
});
