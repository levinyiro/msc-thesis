import { Component, AfterViewInit, OnInit } from '@angular/core';
import { DataService } from './services/data.service';
import { MonitorService } from './services/monitor.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  // basic settings
  worker?: Worker;
  loggingInterval: any;
  canvas?: OffscreenCanvas;

  // measurement
  cpuUsage: string = '';
  memoryUsage: string = '';
  gpuUsage: string = '';
  fps: string = '';

  // new planet
  isAddingPlanet = false;
  newPlanetData: any = {};

  // planets
  planets: any[] = [];
  showPlanetsList: boolean = false;

  constructor(private dataService: DataService, private monitorService: MonitorService) { }

  ngOnInit() {
    this.canvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);

    this.monitorSystemStats();

    this.dataService.getMercuryData().subscribe(data => {
      if (this.worker) {
        this.planets.push(data);
        this.worker.postMessage({ type: 'mercuryData', mercuryData: data });
      }
    });
    
    this.dataService.getVenusData().subscribe(data => {
      if (this.worker) {
        this.planets.push(data);
        this.worker.postMessage({ type: 'venusData', venusData: data });
      }
    });

    this.dataService.getEarthData().subscribe(data => {
      if (this.worker) {
        this.planets.push(data);
        this.worker.postMessage({ type: 'earthData', earthData: data });
      }
    });

    this.dataService.getMarsData().subscribe(data => {
      if (this.worker) {
        this.planets.push(data);
        this.worker.postMessage({ type: 'marsData', marsData: data });
      }
    });

    this.dataService.getJupiterData().subscribe(data => {
      if (this.worker) {
        this.planets.push(data);
        this.worker.postMessage({ type: 'jupiterData', jupiterData: data });
      }
    });

    this.dataService.getSaturnData().subscribe(data => {
      if (this.worker) {
        this.planets.push(data);
        this.worker.postMessage({ type: 'saturnData', saturnData: data });
      }
    });

    this.dataService.getUranusData().subscribe(data => {
      if (this.worker) {
        this.planets.push(data);
        this.worker.postMessage({ type: 'uranusData', uranusData: data });
      }
    });

    this.dataService.getNeptuneData().subscribe(data => {
      if (this.worker) {
        this.planets.push(data);
        this.worker.postMessage({ type: 'neptuneData', neptuneData: data });
      }
    });
  }

  ngAfterViewInit() {
    this.worker = new Worker(new URL('src/app/_workers/threejs.worker.ts', import.meta.url));
    const htmlCanvas = document.getElementById('canvas') as any;
    htmlCanvas.width = window.innerWidth;
    htmlCanvas.height = window.innerHeight;
    this.sortPlanetsByDistance();

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

      this.worker.onmessage = (event) => {
        if (event.data.type === 'fps') {
          this.fps = event.data.fps;
        }
      };
    }
  }

  // private functions
  private monitorSystemStats() {
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
      let cpuUsage;
  
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        const totalJSHeap = memoryInfo.totalJSHeapSize;
        const usedJSHeap = memoryInfo.usedJSHeapSize;
        cpuUsage = (totalJSHeap > 0 ? (usedJSHeap / totalJSHeap) * 100 : 0).toFixed(2);
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
  
      this.monitorService.logMetrics(Number(cpuUsage), memoryUsage, Number(this.fps), Number(finalGpuUsage));
  
      this.memoryUsage = `${memoryUsage} MB`;
      this.cpuUsage = `${cpuUsage}%`;
      this.gpuUsage = `${finalGpuUsage}%`;
  
    }, 1000);
  }

  private sortPlanetsByDistance(): void {
    this.planets.sort((a, b) => {
      const aAxis = a.semimajorAxis ?? 0;
      const bAxis = b.semimajorAxis ?? 0;
      return aAxis - bAxis;
    });
  }

  // event handlings
  exportMetricsToCSV(): void {
    this.monitorService.exportToCSV();
  }

  startAddingPlanet() {
    this.isAddingPlanet = true;
    this.newPlanetData = {
      englishName: `Planet ${Math.floor(Math.random() * 1000)}`,
      color: Math.floor(Math.random() * 0xffffff).toString(),
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

  followPlanet(planet: any) {
    if (this.worker) {
      this.worker.postMessage({
        type: 'followPlanet',
        planetName: planet.englishName
      });
    }
  }

  deletePlanet(planet: any) {
    if (this.worker) {
      this.worker.postMessage({
        type: 'deletePlanet',
        planetName: planet.englishName
      });
    }
    this.planets = this.planets.filter(p => p !== planet);
    this.sortPlanetsByDistance();
  }

  toggleShowPlanetsList() {    
    this.showPlanetsList = !this.showPlanetsList;
  }

  ngOnDestroy() {
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
    }
  }
}
