import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DataService } from './services/data.service';
import { MonitorService } from './services/monitor.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  worker?: Worker;
  monitorWorker?: Worker;
  private loggingInterval: any;
  canvas?: OffscreenCanvas;
  @ViewChild('inputShowLine') inputShowLine!: ElementRef<HTMLInputElement>;
  mercureData: any;
  venusData: any;
  earthData: any;
  marsData: any;
  jupiterData: any;
  saturnData: any;
  uranusData: any;
  neptuneData: any;

  fps: string = '0';
  cpuUsage: string = '0%';
  memoryUsage: string = '0 MB';

  isAddingPlanet = false;
  newPlanetData: any = {};

  constructor(private dataService: DataService, private monitorService: MonitorService) { }

  ngOnInit() {
    this.canvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);

    this.monitorSystemStats();

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

    this.dataService.getMarsData().subscribe(data => {
      this.marsData = data;
      if (this.worker) {
        this.worker.postMessage({ type: 'marsData', marsData: data });
      }
    });

    this.dataService.getJupiterData().subscribe(data => {
      this.jupiterData = data;
      if (this.worker) {
        this.worker.postMessage({ type: 'jupiterData', jupiterData: data });
      }
    });

    this.dataService.getSaturnData().subscribe(data => {
      this.saturnData = data;
      if (this.worker) {
        this.worker.postMessage({ type: 'saturnData', saturnData: data });
      }
    });

    this.dataService.getUranusData().subscribe(data => {
      this.uranusData = data;
      if (this.worker) {
        this.worker.postMessage({ type: 'uranusData', uranusData: data });
      }
    });

    this.dataService.getNeptuneData().subscribe(data => {
      this.neptuneData = data;
      if (this.worker) {
        this.worker.postMessage({ type: 'neptuneData', neptuneData: data });
      }
    });
  }

  monitorSystemStats() {
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
    }

    this.loggingInterval = setInterval(() => {
      let cpuUsage = 0;
      if ('deviceMemory' in navigator) {
        cpuUsage = parseFloat((navigator as any).deviceMemory) || 0;
      }

      let memoryUsage = 0;
      if ((performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        memoryUsage = parseFloat((memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2));
      }

      const fpsValue = parseFloat(this.fps) || 0;

      this.monitorService.logMetrics(cpuUsage, memoryUsage, fpsValue);

      this.memoryUsage = `${memoryUsage} MB`;
      this.cpuUsage = `${cpuUsage} GB (estimated)`;
    }, 1000);
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
            mouseY: event.clientY,
            planetData: this.newPlanetData
          });

          this.isAddingPlanet = false;
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
            mouseY: event.clientY,
            planetData: this.newPlanetData
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

      if (this.marsData) {
        this.worker.postMessage({ type: 'marsData', marsData: this.marsData });
      }

      if (this.jupiterData) {
        this.worker.postMessage({ type: 'jupiterData', jupiterData: this.jupiterData });
      }

      if (this.saturnData) {
        this.worker.postMessage({ type: 'saturnData', saturnData: this.saturnData });
      }

      if (this.uranusData) {
        this.worker.postMessage({ type: 'uranusData', uranusData: this.uranusData });
      }

      if (this.neptuneData) {
        this.worker.postMessage({ type: 'neptuneData', neptuneData: this.neptuneData });
      }

      this.worker.onmessage = (event) => {
        if (event.data.type === 'fps') {
          this.fps = event.data.fps;
        }
      };
    }
  }

  exportMetricsToCSV(): void {
    this.monitorService.exportToCSV();
  }

  startAddingPlanet() {
    this.isAddingPlanet = true;
    this.newPlanetData = {
      name: `Planet ${Math.floor(Math.random() * 1000)}`,
      color: this.getRandomColor().toString(),
      size: 0.2 + Math.random() * 0.5,
      semimajorAxis: 0,
      eccentricity: 0,
      axialTilt: Math.random() * 30
    };
    
    if (this.worker) {
      this.worker.postMessage({ 
        type: 'startAddingPlanet', 
        planetData: this.newPlanetData 
      });
    }
  }
  
  private getRandomColor(): number {
    return Math.floor(Math.random() * 0xffffff);
  }

  ngOnDestroy() {
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
    }
  }
}
