import { Injectable } from '@angular/core';
import * as THREE from 'three';
const insideWorker = require("offscreen-canvas/inside-worker");

@Injectable({
  providedIn: 'root'
})
export class WorkerService {
  private worker: Worker;

  constructor() {
    this.worker = insideWorker(this.handleWorkerMessage.bind(this));
    console.log('Worker initialized');
  }

  private handleWorkerMessage(e: any) {
    console.log('hello');
    
    if (e.data.canvas) {
      const canvas = e.data.canvas;
      const context = canvas.getContext('webgl');

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ alpha: true, canvas: canvas, context: context });
      renderer.setSize(canvas.width, canvas.height);

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

      camera.position.z = 5;

      const radius = 8;
      const angle = 0;
      camera.position.x = Math.sin(angle) * radius;
      camera.position.z = Math.cos(angle) * radius;
      camera.lookAt(object.position);

      renderer.render(scene, camera);

      let isDragging = false;
      let previousX = 0;
      let previousY = 0;

      const rotateCamera = (deltaX: any, deltaY: any) => {
          const sensitivity = 0.01;
          camera.rotation.y -= deltaX * sensitivity;
          camera.rotation.x -= deltaY * sensitivity;
          camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
      };

      const animate = () => {
          requestAnimationFrame(animate);

          const spotLightAngle = Date.now() * 0.0005;
          spotLight.position.x = Math.sin(spotLightAngle) * spotLightRadius;
          spotLight.position.z = Math.cos(spotLightAngle) * spotLightRadius;

          renderer.render(scene, camera);
      };

      animate();
    }
  }

  postCanvas(canvas: OffscreenCanvas) {
    console.log('Posting canvas to worker');
    const message = { type: 'canvas', canvas };
    this.worker.postMessage(message, [canvas]);
  }
}
