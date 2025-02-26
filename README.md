# ThreeJS - Worker

## Steps to make worker works in a new project

1. Add `_workers` folder with `threejs.worker.ts` in it.
2. Add `tsconfig.worker.json` in a new project
    - IMPORTANT! Don't place it into `tsconfig.app.json`
    - it has to contains the following data:
    ```json
    {
        "extends": "./tsconfig.json",
        "compilerOptions": {
            "outDir": "./out-tsc/worker",
            "types": [
                "node"
            ],
            "lib": [
                "es2020",
                "webworker"
            ]
        },
        "include": [
            "src/**/*.worker.ts"
        ]
    }
    ```
3. Add this row to `angular.json` in `projects/{projectname}/architect/build/option`:
    ```json
    "webWorkerTsConfig": "tsconfig.worker.json"
    ```

## Connect worker with Angular
First of all you have to install the following packages:
```sh
npm i three
npm i offscreen-canvas
```

After that you have to implement the following codes
- `app.component.html`
    ```html
    <canvas id="canvas"></canvas>
    ```

- `app.component.ts`
    ```ts
    ngAfterViewInit() {
        this.worker = new Worker(new URL('src/app/_workers/threejs.worker.ts', import.meta.url));

        //...

        var hasOffscreenSupport = !!htmlCanvas.transferControlToOffscreen;
        if (hasOffscreenSupport) {
            var offscreen = htmlCanvas.transferControlToOffscreen() as any;

            this.worker.postMessage({ canvas: offscreen }, [offscreen]);

            // send random event

            htmlCanvas.addEventListener('mousemove', (event: any) => {
                if (this.worker) {
                    this.worker.postMessage({
                        type: 'mousemove',
                        mouseX: event.clientX,
                        mouseY: event.clientY
                    });
                }
            });
        }
    }
    ```

- `threejs.worker.ts`
    ```ts
    const insideWorker = require("offscreen-canvas/inside-worker");
    const THREE = require('three');

    insideWorker((event: any) => {
        if (event.data.canvas) {
            const canvas = event.data.canvas;

            const renderer = new THREE.WebGLRenderer({ canvas: canvas });

            // threejs code...

            // example for event handling
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
    ```

## References

[1] Konva worker implementation. https://github.com/bbarn3y/2022-2023-2-korszeru-angular-alkalmazasok

[2] Worker setup. https://github.com/bbarn3y/2023-2024-2-korszeru-angular-alkalmazasok/commit/f325aa3a581967ca0da9adf869d865e4d2fa381e

[3] Worker with ThreeJS. https://github.com/naotaro0123/three-ts-csg-practice/blob/b1b8e7ce66600caeca7281532efd5ac7db9f9757/src/Workers/OffScreenWorker.ts

[4] Offscreen canvas inside webworker. https://konvajs.org/docs/sandbox/Web_Worker.html


# S3L

- [ ] https://discourse.threejs.org/t/how-to-enable-fps-counter-within-the-three-js-web-editor/33030
- [ ] terhelés - a háttérben mennyi CPU-t eszik (webworkerben lehet nézni?)
- [x] Föld object, ami egy ellipszis pályán mozog
- [x] Összefoglaló a témabejelentőhöz
- [ ] NASA API vizsgálata
- [ ] Statikus elliptikus pálya
- [x] Szakdolgozat leírás módosítása
- [x] Más API keresése
- [ ] Árnyék szemben a nappal
- [x] Textúrák módosítása
- [x] Vonal a pályán
- [x] Kapcsoló - eltűnjön a vonal

# 2024.11.


https://github.com/spite/THREE.MeshLine


háttér gömb felbontásának beállítása
bolygók textúrájára is hatással lehet
    le fogja skálázni a 8k-s képet is
    filter beállítása, amikor a texturát beállítottuk
    nem gömbre feszítették ki - valami más
    sokkal világosabb teszt közben, textura betöltésénél és beállításánál milyen extra filter kell, ami sötétítheti tovább a textúrát

https://threejs.org/docs/#api/en/lights/shadows/SpotLightShadow
https://jsfiddle.net/zoxkhjep/3/

scrolling miért nem jó - wheel helyette


smooth:
https://threejs.org/docs/#api/en/renderers/WebGLRenderer.antialias