import { Planet } from "./models/planet";

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

    let sun: any, earth: any, orbitPath: any, mercury: any, venus: any = null, mars: any = null, jupiter: any = null, saturn: any = null, uranus: any = null, neptune: any = null;
    let earthData: any, mercuryData: any, venusData: any = null, marsData: any = null, jupiterData: any = null, saturnData: any = null, uranusData: any = null, neptuneData: any = null;

    let showLines = true;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let yaw = 0, pitch = 0;
    let moonSpeed: number;
    let orbitLines: any[] = [];
    let moon: any;
    let moonAngle = 0;
    const moonDistance = 2;
    const distanceDivider = 3000000;

    // fps counting
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let fps = 0;

    // add new planet
    let isAddingPlanet = false;
    let previewPlanet: any | null = null;
    let previewOrbit: any | null = null;
    const customPlanets: Planet[] = [];

    let planetSpotLights: any[] = [];

    let targetObject: any;

    let cameraTargetPosition = new THREE.Vector3().copy(camera.position);

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

    function createOrbitLine(data: Planet): any {
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
      orbitPath.name = data.englishName?.toLowerCase().replace(' ', '') + 'Orbit';

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
      createOrbitLine(mercuryData);
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
      light.castShadow = false;
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

    function getInitialAngle(planetData: Planet, date: Date): number {
      const T = planetData.sideralOrbit; // keringési idő napokban
      const n = 2 * Math.PI / T; // középmozgás radian/nap
      const J2000 = new Date('2000-01-01T12:00:00Z'); // alap dátum
    
      const daysSinceEpoch = (date.getTime() - J2000.getTime()) / (1000 * 60 * 60 * 24);
      const M = n * daysSinceEpoch;
    
      return M % (2 * Math.PI); // közép-anomália radiánban, mint kiinduló szög
    }

    function animate() {
      if (earth) {
        earth.angle += earthData.speed;

        earth.rotation.y += 0.05;
        earth.position.x = Math.sin(earth.angle) * (earthData ? earthData.semimajorAxis / distanceDivider : 8);
        earth.position.z = Math.cos(earth.angle) * (earthData ? earthData.semimajorAxis / distanceDivider : 8);
      }

      if (mercury) {
        mercury.angle += mercuryData.speed;
        mercury.rotation.y += 0.05;
        mercury.position.x = Math.sin(mercury.angle) * (mercuryData ? mercuryData.semimajorAxis / distanceDivider : 8);
        mercury.position.z = Math.cos(mercury.angle) * (mercuryData ? mercuryData.semimajorAxis / distanceDivider : 8);
      }

      if (venus) {
        venus.angle += venusData.speed;
        venus.rotation.y += 0.05;
        venus.position.x = Math.sin(venus.angle) * (venusData ? venusData.semimajorAxis / distanceDivider : 8);
        venus.position.z = Math.cos(venus.angle) * (venusData ? venusData.semimajorAxis / distanceDivider : 8);
      }

      if (moon && earth) {
        moonAngle += moonSpeed;
        moon.position.x = earth.position.x + Math.sin(moonAngle) * moonDistance;
        moon.position.z = earth.position.z + Math.cos(moonAngle) * moonDistance;
      }

      if (mars) {
        mars.angle += marsData.speed;
        mars.rotation.y += 0.05;
        mars.position.x = Math.sin(mars.angle) * (marsData ? marsData.semimajorAxis / distanceDivider : 8);
        mars.position.z = Math.cos(mars.angle) * (marsData ? marsData.semimajorAxis / distanceDivider : 8);
      }

      if (jupiter) {
        jupiter.angle += jupiterData.speed;
        jupiter.rotation.y += 0.05;
        jupiter.position.x = Math.sin(jupiter.angle) * (jupiterData ? jupiterData.semimajorAxis / distanceDivider : 8);
        jupiter.position.z = Math.cos(jupiter.angle) * (jupiterData ? jupiterData.semimajorAxis / distanceDivider : 8);
      }

      if (saturn) {
        saturn.angle += saturnData.speed;
        saturn.rotation.y += 0.05;
        saturn.position.x = Math.sin(saturn.angle) * (saturnData ? saturnData.semimajorAxis / distanceDivider : 8);
        saturn.position.z = Math.cos(saturn.angle) * (saturnData ? saturnData.semimajorAxis / distanceDivider : 8);
      }

      if (uranus) {
        uranus.angle += uranusData.speed;
        uranus.rotation.y += 0.05;
        uranus.position.x = Math.sin(uranus.angle) * (uranusData ? uranusData.semimajorAxis / distanceDivider : 8);
        uranus.position.z = Math.cos(uranus.angle) * (uranusData ? uranusData.semimajorAxis / distanceDivider : 8);
      }

      if (neptune) {
        neptune.angle += neptuneData.speed;
        neptune.rotation.y += 0.05;
        neptune.position.x = Math.sin(neptune.angle) * (neptuneData ? neptuneData.semimajorAxis / distanceDivider : 8);
        neptune.position.z = Math.cos(neptune.angle) * (neptuneData ? neptuneData.semimajorAxis / distanceDivider : 8);
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

      customPlanets.forEach(planet => {
        planet.angle += planet.speed;
        const orbitRadius = planet.semimajorAxis! / distanceDivider;
        planet.mesh.position.x = Math.sin(planet.angle!) * orbitRadius;
        planet.mesh.position.z = Math.cos(planet.angle!) * orbitRadius;
        planet.mesh.rotation.y += 0.05;
      });


      if (targetObject) {
        camera.lookAt(targetObject.position);
      }

      camera.position.lerp(cameraTargetPosition, 0.05);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    function createNewPlanet(data: Planet, position: any): any {
      const geometry = new THREE.SphereGeometry(data.size || 0.3, 32, 32);

      const material = new THREE.MeshPhongMaterial({
        color: data.color,
      });

      const planet = new THREE.Mesh(geometry, material);
      planet.position.copy(position);
      planet.rotation.z = getAxialTilt(data.axialTilt || 0);
      planet.castShadow = true;
      planet.receiveShadow = true;
      planet.name = data.englishName?.toLowerCase().replace(' ', '');

      return planet;
    }

    function calculateOrbitDistance(position: any): number {
      return position.distanceTo(sun.position) * distanceDivider;
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
      earth = new THREE.Mesh(earthGeometry, earthMaterial);
      earth.rotation.z = getAxialTilt(earthData?.axialTilt);
      earth.castShadow = true;
      earth.receiveShadow = true;
      earth.name = 'earth';
      const earthSpotLight = createPlanetSpotlight(earth.name);
      earthSpotLight.target = earth;
      scene.add(earthSpotLight);
      planetSpotLights.push(earthSpotLight);
      earth.angle = getInitialAngle(earthData, new Date());
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
      moon.name = 'moon';
      scene.add(moon);

      const moonSpotLight = createPlanetSpotlight(moon.name);
      moonSpotLight.target = moon;
      scene.add(moonSpotLight);
      planetSpotLights.push(moonSpotLight);

      // mercury mesh
      const mercuryTexture = new THREE.Texture(mercuryBitmap);
      mercuryTexture.needsUpdate = true;
      const mercuryGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const mercuryMaterial = new THREE.MeshPhongMaterial({ map: mercuryTexture });
      mercury = new THREE.Mesh(mercuryGeometry, mercuryMaterial);
      mercury.rotation.z = getAxialTilt(mercuryData?.axialTilt);
      mercury.name = 'mercury';
      mercury.angle = getInitialAngle(mercuryData, new Date());
      scene.add(mercury);
      const mercurySpotLight = createPlanetSpotlight(mercury.name);
      mercurySpotLight.target = mercury;
      scene.add(mercurySpotLight);
      planetSpotLights.push(mercurySpotLight);

      // venus mesh
      const venusTexture = new THREE.Texture(venusBitmap);
      venusTexture.needsUpdate = true;
      const venusGeometry = new THREE.SphereGeometry(0.4, 32, 32);
      const venusMaterial = new THREE.MeshPhongMaterial({ map: venusTexture });
      venus = new THREE.Mesh(venusGeometry, venusMaterial);
      venus.rotation.z = getAxialTilt(venusData?.axialTilt);
      venus.name = 'venus';
      venus.angle = getInitialAngle(venusData, new Date());
      scene.add(venus);
      const venusSpotLight = createPlanetSpotlight(venus.name);
      venusSpotLight.target = venus;
      scene.add(venusSpotLight);
      planetSpotLights.push(venusSpotLight);

      const marsTexture = new THREE.Texture(marsBitmap);
      marsTexture.needsUpdate = true;
      const marsGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const marsMaterial = new THREE.MeshPhongMaterial({ map: marsTexture });
      mars = new THREE.Mesh(marsGeometry, marsMaterial);
      mars.rotation.z = getAxialTilt(marsData?.axialTilt);
      mars.name = 'mars';
      mars.angle = getInitialAngle(marsData, new Date());
      scene.add(mars);
      const marsSpotLight = createPlanetSpotlight(mars.name);
      marsSpotLight.target = mars;
      scene.add(marsSpotLight);
      planetSpotLights.push(marsSpotLight);

      const jupiterTexture = new THREE.Texture(jupiterBitmap);
      jupiterTexture.needsUpdate = true;
      const jupiterGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const jupiterMaterial = new THREE.MeshPhongMaterial({ map: jupiterTexture });
      jupiter = new THREE.Mesh(jupiterGeometry, jupiterMaterial);
      jupiter.rotation.z = getAxialTilt(jupiterData?.axialTilt);
      jupiter.name = 'jupiter';
      jupiter.angle = getInitialAngle(jupiterData, new Date());
      scene.add(jupiter);
      const jupiterSpotLight = createPlanetSpotlight(jupiter.name);
      jupiterSpotLight.target = jupiter;
      scene.add(jupiterSpotLight);
      planetSpotLights.push(jupiterSpotLight);

      const saturnTexture = new THREE.Texture(saturnBitmap);
      saturnTexture.needsUpdate = true;
      const saturnGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const saturnMaterial = new THREE.MeshPhongMaterial({ map: saturnTexture });
      saturn = new THREE.Mesh(saturnGeometry, saturnMaterial);
      saturn.rotation.z = getAxialTilt(saturnData?.axialTilt);
      saturn.name = 'saturn';
      saturn.angle = getInitialAngle(saturnData, new Date());
      scene.add(saturn);
      const saturnSpotLight = createPlanetSpotlight(saturn.name);
      saturnSpotLight.target = saturn;
      scene.add(saturnSpotLight);
      planetSpotLights.push(saturnSpotLight);

      const uranusTexture = new THREE.Texture(uranusBitmap);
      uranusTexture.needsUpdate = true;
      const uranusGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const uranusMaterial = new THREE.MeshPhongMaterial({ map: uranusTexture });
      uranus = new THREE.Mesh(uranusGeometry, uranusMaterial);
      uranus.rotation.z = getAxialTilt(uranusData?.axialTilt);
      uranus.name = 'uranus'
      uranus.angle = getInitialAngle(uranusData, new Date());
      scene.add(uranus);
      const uranusSpotLight = createPlanetSpotlight(uranus.name);
      uranusSpotLight.target = uranus;
      scene.add(uranusSpotLight);
      planetSpotLights.push(uranusSpotLight); uranus

      const neptuneTexture = new THREE.Texture(neptuneBitmap);
      neptuneTexture.needsUpdate = true;
      const neptuneGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const neptuneMaterial = new THREE.MeshPhongMaterial({ map: neptuneTexture });
      neptune = new THREE.Mesh(neptuneGeometry, neptuneMaterial);
      neptune.rotation.z = getAxialTilt(neptuneData?.axialTilt);
      neptune.name = 'neptune'
      neptune.angle = getInitialAngle(neptuneData, new Date());
      scene.add(neptune);
      const neptuneSpotLight = createPlanetSpotlight(neptune.name);
      neptuneSpotLight.target = neptune;
      scene.add(neptuneSpotLight);
      planetSpotLights.push(neptuneSpotLight);

      animate();
    }).catch(error => {
      console.error('Error loading textures:', error);
    });

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
            const { planetData } = event.data;

            const position = previewPlanet?.position.clone() ?? new THREE.Vector3(10, 0, 0);
            const orbitDistance = calculateOrbitDistance(position);

            planetData.color = typeof planetData.color === 'string'
              ? parseInt(planetData.color.replace('#', '0x'))
              : typeof planetData.color === 'number'
                ? planetData.color
                : 0xfff000;

            planetData.semimajorAxis = orbitDistance;
            planetData.perihelion = orbitDistance;
            planetData.aphelion = orbitDistance;
            planetData.eccentricity ??= 0;
            planetData.axialTilt ??= 0;
            planetData.size ??= 0.3;
            planetData.mass = {
              massValue: 1,
              massExponent: 24
            };

            planetData.angle = Math.atan2(position.z, position.x);
            planetData.speed = calculateSpeedFromVolatility(planetData, ANIMATION_SPEED);

            const newPlanet = createNewPlanet(planetData, position);
            scene.add(newPlanet);

            const newPlanetSpotLight = createPlanetSpotlight(newPlanet.name);
            newPlanetSpotLight.target = newPlanet;
            scene.add(newPlanetSpotLight);
            planetSpotLights.push(newPlanetSpotLight);

            planetData.mesh = newPlanet;
            customPlanets.push(planetData);

            if (previewPlanet) {
              scene.remove(previewPlanet);
              previewPlanet = null;
            }
            if (previewOrbit) {
              scene.remove(previewOrbit);
              previewOrbit = null;
            }

            if (showLines) {
              const permanentOrbit = createOrbitLine(planetData);
              permanentOrbit.name = planetData.englishName.toLowerCase().replace(' ', '') + 'Orbit';

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

            if (previewOrbit) scene.remove(previewOrbit);

            const orbitData: Planet = {
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
            if (mercuryData) createOrbitLine(mercuryData);
            if (marsData) createOrbitLine(marsData);
            if (jupiterData) createOrbitLine(jupiterData);
            if (saturnData) createOrbitLine(saturnData);
            if (uranusData) createOrbitLine(uranusData);
            if (neptuneData) createOrbitLine(neptuneData);
          }
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
          mercuryData = event.data.mercuryData as Planet;
          mercuryData.color = 0xe7e8ec;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(mercuryData);
          mercuryData.speed = calculateSpeedFromVolatility(mercuryData, ANIMATION_SPEED);
          break;

        case 'venusData':
          venusData = event.data.venusData as Planet;
          venusData.color = 0xeecb8b;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(venusData);
          venusData.speed = calculateSpeedFromVolatility(venusData, ANIMATION_SPEED);
          break;

        case 'earthData':
          earthData = event.data.earthData as Planet;
          earthData.color = 0x6b93d6;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(earthData);
          earthData.speed = calculateSpeedFromVolatility(earthData, ANIMATION_SPEED);
          moonSpeed = 0.005;
          break;

        case 'marsData':
          marsData = event.data.marsData as Planet;
          marsData.color = 0x993d00;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(marsData);
          marsData.speed = calculateSpeedFromVolatility(marsData, ANIMATION_SPEED);
          break;

        case 'jupiterData':
          jupiterData = event.data.jupiterData as Planet;
          jupiterData.color = 0xb07f35;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(jupiterData);
          jupiterData.speed = calculateSpeedFromVolatility(jupiterData, ANIMATION_SPEED);
          break;

        case 'saturnData':
          saturnData = event.data.saturnData as Planet;
          saturnData.color = 0xb08f36;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(saturnData);
          saturnData.speed = calculateSpeedFromVolatility(saturnData, ANIMATION_SPEED);
          break;

        case 'uranusData':
          uranusData = event.data.uranusData as Planet;
          uranusData.color = 0x5580aa;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(uranusData);
          uranusData.speed = calculateSpeedFromVolatility(uranusData, ANIMATION_SPEED);
          break;

        case 'neptuneData':
          neptuneData = event.data.neptuneData as Planet;
          neptuneData.color = 0x366896;
          if (orbitPath) scene.remove(orbitPath);
          createOrbitLine(neptuneData);
          neptuneData.speed = calculateSpeedFromVolatility(neptuneData, ANIMATION_SPEED);
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
      }
    };
  }
});
