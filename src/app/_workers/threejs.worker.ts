const insideWorker = require("offscreen-canvas/inside-worker");
const THREE = require('three');

insideWorker((event: any) => {
  if (event.data.canvas) {
    const canvas = event.data.canvas;

    // get canvas from request
    const renderer = new THREE.WebGLRenderer({ canvas: canvas });

    renderer.setClearColor(0xa9f8fb);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.z = 5;

    const spotLight = new THREE.SpotLight(0xe7c6ff, 0.7);
    const spotLightRadius = 8;
    const spotLightAngle = Date.now() * 0.0005;
    spotLight.position.x = Math.sin(spotLightAngle) * spotLightRadius;
    spotLight.position.z = Math.cos(spotLightAngle) * spotLightRadius;
    scene.add(spotLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const geometry = new THREE.SphereGeometry(3, 64, 32);

    var material = new THREE.MeshPhongMaterial({ color: 0xef476f });

    const object = new THREE.Mesh(geometry, material);
    scene.add(object);

    const radius = 8;
    const angle = 0;
    camera.position.x = Math.sin(angle) * radius;
    camera.position.z = Math.cos(angle) * radius;
    camera.lookAt(object.position);

    function animate() {
      const spotLightAngle = Date.now() * 0.0005;
      spotLight.position.x = Math.sin(spotLightAngle) * spotLightRadius;
      spotLight.position.z = Math.cos(spotLightAngle) * spotLightRadius;
      
      renderer.render(scene, camera);

      requestAnimationFrame(animate);
    }

    animate();

    // handling user event
    self.onmessage = function (event) {
      if (event.data.type === 'mousemove') {
        const mouseX = (event.data.mouseX / canvas.width) * 2 - 1;
        const mouseY = -(event.data.mouseY / canvas.height) * 2 + 1;
        
        object.position.x = mouseX * 5;
        object.position.y = mouseY * 5;
      }
    };
  }
});
