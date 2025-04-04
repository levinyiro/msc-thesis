const THREE = require('three');
const easing = require('maath');

interface LensFlareParams {
  lensPosition?: THREE.Vector3;
  opacity?: number;
}

interface LensFlareUniforms {
  iTime: { value: number };
  iResolution: { value: THREE.Vector2 };
  lensPosition: { value: THREE.Vector2 };
  colorGain: { value: THREE.Color };
  starPoints: { value: number };
  glareSize: { value: number };
  flareSize: { value: number };
  flareSpeed: { value: number };
  flareShape: { value: number };
  haloScale: { value: number };
  opacity: { value: number };
  animated: { value: boolean };
  anamorphic: { value: boolean };
  enabled: { value: boolean };
  secondaryGhosts: { value: boolean };
  starBurst: { value: boolean };
  ghostScale: { value: number };
  aditionalStreaks: { value: boolean };
  followMouse: { value: boolean };
}

export let LensFlareParams: LensFlareParams = {};

export function LensFlareEffect(lensPosition?: THREE.Vector3, opacity?: number): THREE.Mesh {
  LensFlareParams = {
    lensPosition: lensPosition ? lensPosition : new THREE.Vector3(25, 2, -80),
    opacity: opacity ? opacity : 0.8,
  };

  const clock = new THREE.Clock();
  const screenPosition = LensFlareParams.lensPosition!;
  const viewport = new THREE.Vector4();
  const oldOpacity = LensFlareParams.opacity!;

  let internalOpacity = oldOpacity;
  let flarePosition = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();

  const lensFlareMaterial = new THREE.ShaderMaterial({
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      lensPosition: { value: new THREE.Vector2(0, 0) },
      colorGain: { value: new THREE.Color(95, 12, 10) },
      starPoints: { value: 5.0 },
      glareSize: { value: 0.55 },
      flareSize: { value: 0.004 },
      flareSpeed: { value: 0.4 },
      flareShape: { value: 1.2 },
      haloScale: { value: 0.5 },
      opacity: { value: internalOpacity },
      animated: { value: true },
      anamorphic: { value: false },
      enabled: { value: true },
      secondaryGhosts: { value: true },
      starBurst: { value: true },
      ghostScale: { value: 0.3 },
      aditionalStreaks: { value: true },
      followMouse: { value: false },
    } as LensFlareUniforms,

    fragmentShader: `
      // ... (keep the same fragment shader code as before)
    `,

    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,

    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    name: 'LensFlareShader',
  });

  (lensFlareMaterial as any).onBeforeRender = function (
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    const elapsedTime = clock.getElapsedTime();
    renderer.getCurrentViewport(viewport);
    
    const lensFlareContainer = this as THREE.Mesh;
    lensFlareContainer.lookAt(camera.position);

    (lensFlareMaterial.uniforms as LensFlareUniforms).iResolution.value.set(viewport.z, viewport.w);

    if ((lensFlareMaterial.uniforms as LensFlareUniforms).followMouse.value === true) {
      (lensFlareMaterial.uniforms as LensFlareUniforms).lensPosition.value.set(mouse.x, mouse.y);
    } else {
      const projectedPosition = screenPosition.clone();
      projectedPosition.project(camera);

      flarePosition.x = projectedPosition.x;
      flarePosition.y = projectedPosition.y;
      flarePosition.z = projectedPosition.z;

      if (flarePosition.z < 1) {
        (lensFlareMaterial.uniforms as LensFlareUniforms).lensPosition.value.set(
          flarePosition.x,
          flarePosition.y
        );
      }

      raycaster.setFromCamera(new THREE.Vector2(projectedPosition.x, projectedPosition.y), camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      checkTransparency(intersects);
    }

    (lensFlareMaterial.uniforms as LensFlareUniforms).iTime.value = elapsedTime;
    easing.damp(
      (lensFlareMaterial.uniforms as any).opacity,
      'value',
      internalOpacity,
      0.007,
      clock.getDelta()
    );
  };

  function checkTransparency(intersects: THREE.Intersection[]) {
    if (intersects[0]) {
      const material = (intersects[0].object as THREE.Mesh).material;
      
      if ((material as any).transmission) {
        if ((material as any).transmission > 0.2) {
          internalOpacity = oldOpacity * ((material as any).transmission * 0.5);
        } else {
          internalOpacity = 0;
        }
      } else if ((material as any).transmission === 0) {
        internalOpacity = 0;
      } else if ((material as any).transmission === undefined) {
        if (material.transparent) {
          if (material.opacity < 0.98) {
            internalOpacity = oldOpacity / (material.opacity * 10);
          }
        } else {
          if ((intersects[0].object as any).userData === 'no-occlusion') {
            internalOpacity = oldOpacity;
          } else {
            internalOpacity = 0;
          }
        }
      }
    } else {
      internalOpacity = oldOpacity;
    }
  }

  const mouse = new THREE.Vector2();
  window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  });

  const lensFlareContainer = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2, 1, 1),
    lensFlareMaterial
  );

  return lensFlareContainer;
}