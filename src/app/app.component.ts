import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DataService } from './services/data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  worker?: Worker;
  canvas?: OffscreenCanvas;
  @ViewChild('inputShowLine') inputShowLine!: ElementRef<HTMLInputElement>;
  mercureData: any;
  venusData: any;
  earthData: any;

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.canvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);

    this.dataService.getMercureData().subscribe(data => {
      this.mercureData = data;
      if (this.worker) {
        this.worker.postMessage({ type: 'mercureData', mercureData: data });
      }
    });
    
    this.dataService.getVenusData().subscribe(data => {
      this.venusData = data;
      if (this.worker) {
        this.worker.postMessage({ type: 'venusData', venusData: data });
      }
    });

    this.dataService.getEarthData().subscribe(data => {
      this.earthData = data;
      if (this.worker) {
        this.worker.postMessage({ type: 'earthData', earthData: data });
      }
    });
  }

  ngAfterViewInit() {
    this.worker = new Worker(new URL('src/app/_workers/threejs.worker.ts', import.meta.url));
    const htmlCanvas = document.getElementById('canvas') as any;
    htmlCanvas.width = window.innerWidth;
    htmlCanvas.height = window.innerHeight;

    if (htmlCanvas.transferControlToOffscreen) {
      const offscreen = htmlCanvas.transferControlToOffscreen() as any;
      this.worker.postMessage({ canvas: offscreen }, [offscreen]);

      htmlCanvas.addEventListener('mousedown', (event: MouseEvent) => {
        if (this.worker) {
          this.worker.postMessage({
            type: 'mousedown',
            mouseX: event.clientX,
            mouseY: event.clientY
          });
        }
      });

      htmlCanvas.addEventListener('mouseup', () => {
        if (this.worker) {
          this.worker.postMessage({ type: 'mouseup' });
        }
      });

      htmlCanvas.addEventListener('mousemove', (event: MouseEvent) => {
        if (this.worker) {
          this.worker.postMessage({
            type: 'mousemove',
            mouseX: event.clientX,
            mouseY: event.clientY
          });
        }
      });

      window.addEventListener('keydown', (event: KeyboardEvent) => {
        if (this.worker && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
          this.worker.postMessage({ type: 'keydown', key: event.key });
        }
      });

      const checkbox = document.getElementById('inputShowLine') as HTMLInputElement;
      checkbox.addEventListener('change', () => {
        if (this.worker) {
          this.worker.postMessage({
            type: 'toggleLines',
            showLines: checkbox.checked
          });
        }
      });

      if (this.mercureData) {
        this.worker.postMessage({ type: 'mercureData', mercureData: this.mercureData });
      }

      if (this.venusData) {
        this.worker.postMessage({ type: 'venusData', venusData: this.venusData });
      }

      if (this.earthData) {
        this.worker.postMessage({ type: 'earthData', earthData: this.earthData });
      }

      this.worker.onmessage = (event) => {
        if (event.data.type === 'fps') {
          const fpsCounter = document.getElementById('fpsCounter');
          if (fpsCounter) {
            fpsCounter.innerText = `FPS: ${event.data.fps}`;
          }
        }
      };
    
      const fpsElement = document.createElement('div');
      fpsElement.id = 'fpsCounter';
      fpsElement.style.position = 'absolute';
      fpsElement.style.top = '10px';
      fpsElement.style.right = '10px';
      fpsElement.style.color = 'white';
      fpsElement.style.background = 'rgba(0, 0, 0, 0.5)';
      fpsElement.style.padding = '5px';
      fpsElement.style.borderRadius = '5px';
      document.body.appendChild(fpsElement);
    }
  }
}
