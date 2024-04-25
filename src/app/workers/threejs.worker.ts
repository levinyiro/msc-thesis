import * as THREE from 'three';
const insideWorker = require("offscreen-canvas/inside-worker");

const worker = insideWorker((e: any) => {
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

        // https://github.com/bbarn3y/2022-2023-2-korszeru-angular-alkalmazasok/blob/1634a0d6d4ec215e67e6c7f8fc5400505d73bce9/src/app/_workers/konva.worker.ts#L22 - offscreencanvas angularban

        // https://github.com/bbarn3y/2022-2023-2-korszeru-angular-alkalmazasok/blob/1634a0d6d4ec215e67e6c7f8fc5400505d73bce9/src/app/_workers/konva.worker.ts#L26 - messaging angularban

        // ezt messagekkel kell - a tulajdonsagokat atadni parameterkent

        // document.addEventListener('mousedown', (event) => {
        //     isDragging = true;
        //     previousX = event.clientX;
        //     previousY = event.clientY;
        // });

        // document.addEventListener('mousemove', (event) => {
        //     if (isDragging) {
        //         const deltaX = event.clientX - previousX;
        //         const deltaY = event.clientY - previousY;
        //         rotateCamera(deltaX, deltaY);
        //         previousX = event.clientX;
        //         previousY = event.clientY;
        //         renderer.render(scene, camera);
        //     }
        // });

        // document.addEventListener('mouseup', () => {
        //     isDragging = false;
        // });

        // window.addEventListener('resize', () => {
        //     camera.aspect = canvas.width / canvas.height;
        //     camera.updateProjectionMatrix();
        //     renderer.setSize(canvas.width, canvas.height);
        //     renderer.render(scene, camera);
        // });

        const animate = () => {
            requestAnimationFrame(animate);

            const spotLightAngle = Date.now() * 0.0005;
            spotLight.position.x = Math.sin(spotLightAngle) * spotLightRadius;
            spotLight.position.z = Math.cos(spotLightAngle) * spotLightRadius;

            renderer.render(scene, camera);
        };

        animate();
    }
});