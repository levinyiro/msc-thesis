import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  worker?: Worker;
  canvas?: OffscreenCanvas;
  @ViewChild('divContainer') divContainer!: ElementRef<HTMLDivElement>;

  constructor() {}

  ngOnInit() {
    this.canvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);
  }

  ngAfterViewInit() {
    this.worker = new Worker(new URL('src/app/_workers/threejs.worker.ts', import.meta.url));

    this.worker.onmessage = ({ data }) => {
      if (data.type === 'render') {
        this.divContainer.nativeElement.innerHTML = '';
        this.divContainer.nativeElement.appendChild(data.canvas);
      }
    };

    this.worker.onerror = ( (error) => {
      console.log('Error on worker', error);
    });

    if (this.canvas && this.worker) {
      this.worker.postMessage({ type: 'canvas', canvas: this.canvas }, [this.canvas]);
    }
  }
}
