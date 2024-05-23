const insideWorker = require("offscreen-canvas/inside-worker");
let THREE = require("three");

insideWorker((event: any) => {
  if (event.data.canvas) {
    console.log('hello');
    
    const canvas = event.data.canvas;
    canvas.style = { width: 0, height: 0 };
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas
    });
    renderer.setSize(canvas.width, canvas.height);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 1, 10000);
    camera.position.set(0, 0, 50);
    camera.lookAt(0, 0, 0);
    const geometry = new THREE.BoxGeometry(10, 10, 10, 1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 'red',
      wireframe: true
    });
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    function render() {
      mesh.rotation.y += 0.05;
      mesh.rotation.x += 0.05;
      renderer.render(scene, camera);
      requestAnimationFrame(() => render());
    }

    render();

    // // postMessage({ type: 'canvas', canvas: canvas });
  }
});
