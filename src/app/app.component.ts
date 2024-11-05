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
  earthData: any;

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.canvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);

    this.dataService.getEarthData().subscribe(data => {
      this.earthData = data;

      if (this.worker) {
        this.worker.postMessage({ type: 'earthData', earthData: data });
      }
    });
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

    const checkbox = document.getElementById('inputShowLine') as HTMLInputElement;

    checkbox.addEventListener('change', () => {      
      if (this.worker) {        
        this.worker.postMessage({
          type: 'toggleLines',
          showLines: checkbox.checked
        });
      }
    });

    if (this.earthData) {
      this.worker.postMessage({ type: 'earthData', earthData: this.earthData });
    }
  }

  fetchEarthInformations() {
    // https://api.le-systeme-solaire.net/en/
  }
}
