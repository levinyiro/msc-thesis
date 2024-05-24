const insideWorker = require("offscreen-canvas/inside-worker");
const THREE = require('three');

insideWorker((event: any) => {
  if (event.data.canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas: event.data.canvas });
    // renderer.setSize();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, event.data.canvas.width / event.data.canvas.height, 0.1, 1000);
    camera.position.z = 5;

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    function animate() {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();
  }
});
