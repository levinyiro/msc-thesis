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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    let sun: any;
    let earth: any;
    let sunSpotLight: any;
    const earthOrbitRadius = 8;
    let earthAngle = 0;
    let showLines = true;
    let orbitPath: any = null;

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

        sunSpotLight = new THREE.SpotLight(0xe7c6ff, 10);
        sunSpotLight.position.set(0, 0, 0);
        sunSpotLight.angle = Math.PI / 6;
        sunSpotLight.penumbra = 0.2;
        sunSpotLight.decay = 2;
        sunSpotLight.distance = 50;

        scene.add(sunSpotLight);

        sunSpotLight.target = new THREE.Object3D();
        scene.add(sunSpotLight.target);
      });

    // Function to create the Earth's orbit line
    function createOrbitLine() {
      if (orbitPath) {
        scene.remove(orbitPath);
      }

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
        earth.position.x = Math.sin(earthAngle) * earthOrbitRadius;
        earth.position.z = Math.cos(earthAngle) * earthOrbitRadius;
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
        const earthMaterial = new THREE.MeshPhongMaterial({
          map: texture,
        });
        earth = new THREE.Mesh(earthGeometry, earthMaterial);
        scene.add(earth);
      });

    self.onmessage = function (event) {
      if (event.data.type === 'mousemove') {
        const mouseX = (event.data.mouseX / canvas.width) * 2 - 1;
        const mouseY = -(event.data.mouseY / canvas.height) * 2 + 1;

        camera.position.x = mouseX * 10;
        camera.position.y = mouseY * 10;
        camera.position.z = 15;

        camera.lookAt(sun.position);
      }

      if (event.data.type === 'toggleLines') {
        showLines = event.data.showLines;
        
        if (showLines) {
          createOrbitLine();
        } else if (orbitPath) {
          scene.remove(orbitPath);
          orbitPath = null;
        }     
      }
    };
  }
});
