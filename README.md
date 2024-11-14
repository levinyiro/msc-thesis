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

## Publication sources
- https://iopscience.iop.org/article/10.1086/659427/meta
- https://iopscience.iop.org/article/10.3847/1538-4365/ac5cc2/meta
- https://d1wqtxts1xzle7.cloudfront.net/46532459/END_2016_Book_of_Proceedings.pdf?1466069437=&response-content-disposition=inline%3B+filename%3DUNIVERSITY_LEADERSHIP_THE_CASE_OF_UNIVER.pdf&Expires=1731598479&Signature=La~sr1-fZN~yTYq96W06ebnsYhm3x0LdcrdJDw9uJBCyp2TtNITbr-RbbIo0OhjyJatEtQSi1woYnCI8CLF4avDANbOiFF0PZnX3tTnOkG2ZWV6f71nm1yaV1mw3EjLzCpU2V1nPLoChAanP5fnt7mURhcytGrrM5cNCQBvISY56hoek55XA6981ah0fY8GyHixgH4Z8c~M0oFxVQm4X37JIH3Qx2TA9wQyPGDVs3nxST3tqW4IA~uDpzX2-61pQclecDQoh-~LrW21-3F~WWiI4G6VAk0nS~XsTYp0UabqpP-o~t0suPg~Qhqcjcjkef4riwRjGzcufDHAeHlsHow__&Key-Pair-Id=APKAJLOHF5GGSLRBV4ZA#page=35
- https://d1wqtxts1xzle7.cloudfront.net/60546721/476-ArticleText-3751-3-10-2019083020190910-3920-ke36ge-libre.pdf?1568115647=&response-content-disposition=inline%3B+filename%3DAugmented_Reality_and_Virtual_Reality_We.pdf&Expires=1731598560&Signature=asBuYskRB25Aajp5bpjmpsH7IMzl1JLZore8dzXuooKf0Bz7dk9uQhLqwmpHYb0TsZxM2r9cmsYOjxI-2dEOChCFpbl3NJuhrn4QmM6PlID4FQiT~x4T1S9ibWpCz~9HPXoVpSmgIe7bTX7Ls0ntMWmf1mrUfEcF0mORo6c-kNc6ctWgyE2nMpRxEzMaok8qMsNEYwkJkKYbdG6j9hy0DJXJEEpsqgvPo4aH4xRW5gyUSsdCwER8pEhjZPvAnYZbckV9~Jzq8QrPOcdWTLEFJVFSQZzcS0c~2soUsU5m4Fv0E2rgmsjyKKdckwXHDoPVdr31n-qmi4HbkSzlU8MGWQ__&Key-Pair-Id=APKAJLOHF5GGSLRBV4ZA
