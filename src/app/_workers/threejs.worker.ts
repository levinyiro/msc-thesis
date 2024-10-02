const insideWorker = require("offscreen-canvas/inside-worker");
const THREE = require('three');

insideWorker((event: any) => {
  if (event.data.canvas) {
    const canvas = event.data.canvas;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas });
    renderer.setClearColor(0xa9f8fb);

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

    // Nap
    const sunGeometry = new THREE.SphereGeometry(3, 64, 32);
    const sunMaterial = new THREE.MeshPhongMaterial({ color: 0xef476f });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Föld
    const earthGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const earthMaterial = new THREE.MeshPhongMaterial({ color: 0x3c7ef7 });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    const earthOrbitRadius = 8; // A Föld pályájának sugara
    let earthAngle = 0; // A Föld szöghelyzete

    function animate() {
      // Spotlight animáció
      const spotLightAngle = Date.now() * 0.0005;
      spotLight.position.x = Math.sin(spotLightAngle) * spotLightRadius;
      spotLight.position.z = Math.cos(spotLightAngle) * spotLightRadius;

      // Föld pozíció frissítése a pályán
      earthAngle += 0.01; // A Föld körüli mozgás sebessége
      earth.position.x = Math.sin(earthAngle) * earthOrbitRadius;
      earth.position.z = Math.cos(earthAngle) * earthOrbitRadius;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();

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
