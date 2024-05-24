import { Component, AfterViewInit, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  worker?: Worker;
  canvas?: OffscreenCanvas;

  constructor() { }

  ngOnInit() {
    this.canvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);
  }

  ngAfterViewInit() {
    // connect to worker
    this.worker = new Worker(new URL('src/app/_workers/threejs.worker.ts', import.meta.url));

    const htmlCanvas = document.getElementById('canvas') as any;
    htmlCanvas.width = window.innerWidth;
    htmlCanvas.height = window.innerHeight;

    var hasOffscreenSupport = !!htmlCanvas.transferControlToOffscreen;
    if (hasOffscreenSupport) {
      var offscreen = htmlCanvas.transferControlToOffscreen() as any;

      // send canvas offscreen to worker
      this.worker.postMessage({ canvas: offscreen }, [offscreen]);

      // event handling and sending to worker
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
}
