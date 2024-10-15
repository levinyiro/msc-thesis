const insideWorker = require("offscreen-canvas/inside-worker");
const THREE = require('three');

insideWorker((event: any) => {
  if (event.data.canvas) {
    const canvas = event.data.canvas;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas });
    renderer.setClearColor(0x111111);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.z = 15;

    const spotLight = new THREE.SpotLight(0xe7c6ff, 0.7);
    const spotLightRadius = 8;
    const spotLightAngle = Date.now() * 0.0005;
    spotLight.position.x = Math.sin(spotLightAngle) * spotLightRadius;
    spotLight.position.z = Math.cos(spotLightAngle) * spotLightRadius;
    scene.add(spotLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    // Sun
    // const sunGeometry = new THREE.SphereGeometry(3, 64, 32);
    // const sunMaterial = new THREE.MeshPhongMaterial({ color: 0xfdb813 });
    // const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    // scene.add(sun);
    let sun: any;

    let earth: any;
    const earthOrbitRadius = 8; // Earth's orbit radius
    let earthAngle = 0; // Earth's angular position

    // Create the earth orbit path
    const orbitCurve = new THREE.EllipseCurve(
      0, 0,
      earthOrbitRadius, earthOrbitRadius,
      0, 2 * Math.PI,
      false,
      0
    );
    
    const points = orbitCurve.getPoints(100);
    const orbitPathGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const orbitPathMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const orbitPath = new THREE.Line(orbitPathGeometry, orbitPathMaterial);
    orbitPath.rotation.x = Math.PI / 2;

    scene.add(orbitPath);

    function animate() {
      // Spotlight animation
      const spotLightAngle = Date.now() * 0.0005;
      spotLight.position.x = Math.sin(spotLightAngle) * spotLightRadius;
      spotLight.position.z = Math.cos(spotLightAngle) * spotLightRadius;

      if (sun) {
        sun.rotation.y -= 0.001;
      }

      // Update Earth's position on its orbit if Earth is defined
      if (earth) {
        earthAngle += 0.001; // Earth's orbital speed
        earth.rotation.y += 0.05;
        earth.position.x = Math.sin(earthAngle) * earthOrbitRadius;
        earth.position.z = Math.cos(earthAngle) * earthOrbitRadius;
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();

    fetch('../assets/sun-texture.jpg')
    .then(response => response.blob())
    .then(blob => createImageBitmap(blob))
    .then(imageBitmap => {
      const texture = new THREE.Texture(imageBitmap);
      texture.needsUpdate = true;

      const sunGeometry = new THREE.SphereGeometry(3, 64, 32);
      const sunMaterial = new THREE.MeshPhongMaterial({
        map: texture
      });
      sun = new THREE.Mesh(sunGeometry, sunMaterial);
      scene.add(sun);
    });

    fetch('../assets/earth-texture.jpg')
      .then(response => response.blob())
      .then(blob => createImageBitmap(blob))
      .then(imageBitmap => {
        const texture = new THREE.Texture(imageBitmap);
        texture.needsUpdate = true;

        const earthGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const earthMaterial = new THREE.MeshPhongMaterial({
          map: texture
        });
        earth = new THREE.Mesh(earthGeometry, earthMaterial);
        scene.add(earth);
      });

    // Handle mouse movement events
    self.onmessage = function (event) {
      if (event.data.type === 'mousemove') {
        const mouseX = (event.data.mouseX / canvas.width) * 2 - 1;
        const mouseY = -(event.data.mouseY / canvas.height) * 2 + 1;

        camera.position.x = mouseX * 10;
        camera.position.y = mouseY * 10;
        camera.position.z = 15;

        camera.lookAt(sun.position);
      }
    };
  }
});
