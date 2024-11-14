const insideWorker = require("offscreen-canvas/inside-worker");
const THREE = require('three');

insideWorker((event: any) => {
  if (event.data.canvas) {
    const canvas = event.data.canvas;
    const renderer = new THREE.WebGLRenderer({ canvas: canvas });
    renderer.setClearColor(0x111111);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.z = 100;
    camera.position.y = 20;
    camera.rotation.x = -0.3;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    let sun: any, earth: any, sunSpotLight: any, orbitPath: any = null;
    let earthData: any, mercurData: any, venusData: any = null;
    let earthAngle = 0;
    let showLines = true;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let yaw = 0, pitch = 0;

    fetch('../assets/sun-texture.jpg')
      .then(response => response.blob())
      .then(blob => createImageBitmap(blob))
      .then(imageBitmap => {
        const texture = new THREE.Texture(imageBitmap);
        texture.needsUpdate = true;
        const sunGeometry = new THREE.SphereGeometry(3, 64, 32);
        const sunMaterial = new THREE.MeshPhongMaterial({ map: texture });
        sun = new THREE.Mesh(sunGeometry, sunMaterial);
        scene.add(sun);

        sunSpotLight = new THREE.SpotLight(0xe7c6ff, 10);
        sunSpotLight.position.set(0, 0, 0);
        sunSpotLight.angle = Math.PI / 6;
        sunSpotLight.penumbra = 0.2;
        sunSpotLight.decay = 2;
        sunSpotLight.distance = 1000;
        scene.add(sunSpotLight);
        sunSpotLight.target = new THREE.Object3D();
        scene.add(sunSpotLight.target);
      });

    function createOrbitLine() {
      if (!earthData) return;

      if (orbitPath) {
        scene.remove(orbitPath);
      }

      const perihelion = earthData.perihelion / 2000000;
      const aphelion = earthData.aphelion / 2000000;
      const eccentricity = earthData.eccentricity;

      const semiMajorAxis = (perihelion + aphelion) / 2;
      const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - Math.pow(eccentricity, 2));

      const orbitCurve = new THREE.EllipseCurve(
        0, 0, semiMajorAxis, semiMinorAxis, 0, 2 * Math.PI, false, 0
      );

      const points = orbitCurve.getPoints(100);
      const orbitPathGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const orbitPathMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
      orbitPath = new THREE.Line(orbitPathGeometry, orbitPathMaterial);
      orbitPath.rotation.x = Math.PI / 2;
      scene.add(orbitPath);
    }

    if (showLines) {
      createOrbitLine();
    }

    function animate() {
      if (sun) {
        sunSpotLight.position.copy(sun.position);
        sunSpotLight.target.position.set(earth.position.x, earth.position.y, earth.position.z);
        sunSpotLight.target.updateMatrixWorld();
      }

      if (earth) {
        earthAngle += 0.001;
        earth.rotation.y += 0.05;
        earth.position.x = Math.sin(earthAngle) * (earthData ? earthData.semimajorAxis / 2000000 : 8);
        earth.position.z = Math.cos(earthAngle) * (earthData ? earthData.semimajorAxis / 2000000 : 8);
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();

    fetch('../assets/earth-texture.jpg')
      .then(response => response.blob())
      .then(blob => createImageBitmap(blob))
      .then(imageBitmap => {
        const texture = new THREE.Texture(imageBitmap);
        texture.needsUpdate = true;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.x = 1;
        texture.repeat.y = -1;
        const earthGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const earthMaterial = new THREE.MeshPhongMaterial({ map: texture });
        earth = new THREE.Mesh(earthGeometry, earthMaterial);
        scene.add(earth);
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
            camera.rotation.set(pitch, yaw, 0);
            previousMousePosition = { x: event.data.mouseX, y: event.data.mouseY };
          }
          break;

        case 'toggleLines':
          showLines = event.data.showLines;
          showLines ? createOrbitLine() : scene.remove(orbitPath);
          break;

        case 'keydown':
          const step = 2;
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          if (event.data.key === 'ArrowUp') camera.position.addScaledVector(direction, step);
          if (event.data.key === 'ArrowDown') camera.position.addScaledVector(direction, -step);
          if (event.data.key === 'ArrowLeft') camera.position.x -= step * Math.cos(yaw);
          if (event.data.key === 'ArrowRight') camera.position.x += step * Math.cos(yaw);
          break;

        case 'mercurData':
          mercurData = event.data.mercurData;
          createOrbitLine();
          console.log('Received mercurData:', mercurData);
          break;
          
        case 'venusData':
          venusData = event.data.venusData;
          createOrbitLine();
          console.log('Received venusData:', venusData);
          break;

        case 'earthData':
          earthData = event.data.earthData;
          createOrbitLine();
          console.log('Received earthData:', earthData);
          break;
      }
    };
  }
});
