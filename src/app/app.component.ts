import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DataService } from './services/data.service';
import { MonitorService } from './services/monitor.service';
import { Planet } from './_workers/models/planet';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  worker?: Worker;
  monitorWorker?: Worker;
  loggingInterval: any;
  canvas?: OffscreenCanvas;
  @ViewChild('inputShowLine') inputShowLine!: ElementRef<HTMLInputElement>;
  mercuryData: any;
  venusData: any;
  earthData: any;
  marsData: any;
  jupiterData: any;
  saturnData: any;
  uranusData: any;
  neptuneData: any;

  cpuUsage: string = '';
  memoryUsage: string = '';
  gpuUsage: string = '';
  fps: string = '';

  isAddingPlanet = false;
  newPlanetData: any = {};

  planets: Planet[] = [];
  showPlanetsList: boolean = false;

  constructor(private dataService: DataService, private monitorService: MonitorService) { }

  ngOnInit() {
    this.canvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);

    this.monitorSystemStats();

    this.dataService.getMercuryData().subscribe(data => {
      this.mercuryData = data;
      if (this.worker) {
        this.planets.push(this.mercuryData);
        this.worker.postMessage({ type: 'mercuryData', mercuryData: data });
      }
    });
    
    this.dataService.getVenusData().subscribe(data => {
      this.venusData = data;
      if (this.worker) {
        this.planets.push(this.venusData);
        this.worker.postMessage({ type: 'venusData', venusData: data });
      }
    });

    this.dataService.getEarthData().subscribe(data => {
      this.earthData = data;
      if (this.worker) {
        this.planets.push(this.earthData);
        this.worker.postMessage({ type: 'earthData', earthData: data });
      }
    });

    this.dataService.getMarsData().subscribe(data => {
      this.marsData = data;
      if (this.worker) {
        this.planets.push(this.marsData);
        this.worker.postMessage({ type: 'marsData', marsData: data });
      }
    });

    this.dataService.getJupiterData().subscribe(data => {
      this.jupiterData = data;
      if (this.worker) {
        this.planets.push(this.jupiterData);
        this.worker.postMessage({ type: 'jupiterData', jupiterData: data });
      }
    });

    this.dataService.getSaturnData().subscribe(data => {
      this.saturnData = data;
      if (this.worker) {
        this.planets.push(this.saturnData);
        this.worker.postMessage({ type: 'saturnData', saturnData: data });
      }
    });

    this.dataService.getUranusData().subscribe(data => {
      this.uranusData = data;
      if (this.worker) {
        this.planets.push(this.uranusData);
        this.worker.postMessage({ type: 'uranusData', uranusData: data });
      }
    });

    this.dataService.getNeptuneData().subscribe(data => {
      this.neptuneData = data;
      if (this.worker) {
        this.planets.push(this.neptuneData);
        this.worker.postMessage({ type: 'neptuneData', neptuneData: data });
      }
    });
  }

  monitorSystemStats() {
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
    }
  
    const estimateGpuPower = (renderer: string): number => {
      const gpuScores: { [key: string]: number } = {
        'Apple M2': 95,
        'Apple M1': 85,
        'Intel': 40,
        'NVIDIA': 90,
        'AMD': 80,
        'ANGLE': 60,
      };
  
      for (const [key, value] of Object.entries(gpuScores)) {
        if (renderer.includes(key)) return value;
      }
      return 50;
    };
  
    let gpuRenderer = 'Unknown GPU';
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuRenderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  
    const gpuScore = estimateGpuPower(gpuRenderer);
  
    let lastFrameTime = performance.now();
    const frameDurations: number[] = [];
  
    const measureGPU = () => {
      const now = performance.now();
      const duration = now - lastFrameTime;
      frameDurations.push(duration);
      if (frameDurations.length > 60) frameDurations.shift();
  
      lastFrameTime = now;
      requestAnimationFrame(measureGPU);
    };
    measureGPU();
  
    this.loggingInterval = setInterval(() => {
      let cpuUsage = 0;
  
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        const totalJSHeap = memoryInfo.totalJSHeapSize;
        const usedJSHeap = memoryInfo.usedJSHeapSize;
        cpuUsage = totalJSHeap > 0 ? (usedJSHeap / totalJSHeap) * 100 : 0;
      }
  
      let memoryUsage = 0;
      if ((performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        memoryUsage = parseFloat((memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2));
      }
  
      const gpuUsageFromFPS = Math.max(
        0,
        Math.min(100, ((33.33 - Number(this.fps)) / 16.67) * 100)
      );
  
      const finalGpuUsage = ((gpuScore + gpuUsageFromFPS) / 2).toFixed(2);
  
      this.monitorService.logMetrics(cpuUsage, memoryUsage, Number(this.fps), Number(finalGpuUsage));
  
      this.memoryUsage = `${memoryUsage} MB`;
      this.cpuUsage = `${cpuUsage.toFixed(2)}%`;
      this.gpuUsage = `${finalGpuUsage}%`;
  
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
          const rect = htmlCanvas.getBoundingClientRect();
      
          this.worker.postMessage({
            type: 'mousedown',
            mouseX: event.clientX - rect.left,
            mouseY: event.clientY - rect.top,
            canvasWidth: htmlCanvas.width,
            canvasHeight: htmlCanvas.height,
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

      window.addEventListener('resize', () => {
        if (this.worker && htmlCanvas) {
          const rect = htmlCanvas.getBoundingClientRect();
      
          this.worker.postMessage({
            type: 'update_canvas',
            rect: {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              height: rect.height,
              width: rect.width,
            },
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
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

      if (this.mercuryData) {
        this.worker.postMessage({ type: 'mercuryData', mercuryData: this.mercuryData });
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

  sortPlanetsByDistance(): void {
    this.planets.sort((a, b) => a.semimajorAxis - b.semimajorAxis);
  }

  startAddingPlanet() {
    this.isAddingPlanet = true;
    this.newPlanetData = {
      englishName: `Planet ${Math.floor(Math.random() * 1000)}`,
      color: this.getRandomColor().toString(),
      size: 0.2 + Math.random() * 0.5,
      semimajorAxis: 0,
      eccentricity: 0,
      axialTilt: Math.random() * 30,
    };

    this.planets.push(this.newPlanetData);
    
    if (this.worker) {
      this.worker.postMessage({ 
        type: 'startAddingPlanet', 
        planetData: this.newPlanetData 
      });
    }

    // get back list from worker
    if (this.worker) {
      this.worker.postMessage({ 
        type: 'getPlanets', 
        planetData: this.newPlanetData 
      });
    }
    this.sortPlanetsByDistance();
  }
  
  private getRandomColor(): number {
    return Math.floor(Math.random() * 0xffffff);
  }

  deletePlanet(planet: Planet) {
    if (this.worker) {
      this.worker.postMessage({
        type: 'deletePlanet',
        planetName: planet.englishName
      });
    }
    this.planets = this.planets.filter(p => p !== planet);
    this.sortPlanetsByDistance();
  }

  followPlanet(planet: Planet) {
    if (this.worker) {
      this.worker.postMessage({
        type: 'followPlanet',
        planetName: planet.englishName
      });
    }
  }

  toggleShowPlanetsList() {
    this.sortPlanetsByDistance();
    this.showPlanetsList = !this.showPlanetsList;
  }

  ngOnDestroy() {
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
    }
  }
}
