import { Component, AfterViewInit, OnInit } from '@angular/core';
import { DataService } from './services/data.service';
import { MonitorService } from './services/monitor.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnInit, AfterViewInit {
  // basic settings
  worker?: Worker;
  loggingInterval: any;
  canvas?: OffscreenCanvas;
  startAnimation: boolean = true;
  animationSpeed: number = 50;

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
  }

  ngAfterViewInit() {
    this.worker = new Worker(new URL('./_workers/threejs.worker.ts', import.meta.url));
    const htmlCanvas = document.getElementById('canvas') as any;
    htmlCanvas.width = window.innerWidth;
    htmlCanvas.height = window.innerHeight;
    this.sortPlanetsByDistance();

    if (htmlCanvas.transferControlToOffscreen) {
      const offscreen = htmlCanvas.transferControlToOffscreen() as any;
      this.worker.postMessage({ canvas: offscreen }, [offscreen]);

      this.planets.push({
        name: 'Sun',
        deletable: false
      });
  
      // mercury
      let data = this.dataService.getMercuryData();          
      data.name = data.englishName;
      this.planets.push(data);
      this.worker!.postMessage({ type: 'mercuryData', mercuryData: data });
      
      // venus
      data = this.dataService.getVenusData();
      data.name = data.englishName;
      this.planets.push(data);
      this.worker.postMessage({ type: 'venusData', venusData: data });
        
      // earth
      data = this.dataService.getEarthData();          
      data.name = data.englishName;
      this.planets.push(data);
      this.worker!.postMessage({ type: 'earthData', earthData: data });
  
      data = this.dataService.getMarsData();
      data.name = data.englishName;
      this.planets.push(data);
      this.worker.postMessage({ type: 'marsData', marsData: data });
  
      data = this.dataService.getJupiterData();
      data.name = data.englishName;
      this.planets.push(data);
      this.worker.postMessage({ type: 'jupiterData', jupiterData: data });
  
      data = this.dataService.getSaturnData();
      data.name = data.englishName;
      this.planets.push(data);
      this.worker.postMessage({ type: 'saturnData', saturnData: data });

      data = this.dataService.getUranusData();
      data.name = data.englishName;
      this.planets.push(data);
      this.worker.postMessage({ type: 'uranusData', uranusData: data });
  
      data = this.dataService.getNeptuneData();
      data.name = data.englishName;
      this.planets.push(data);
      this.worker.postMessage({ type: 'neptuneData', neptuneData: data });

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
          this.worker.postMessage({
            type: 'resize',
            width: window.innerWidth,
            height: window.innerHeight,
          });
        }
      });
      
      window.addEventListener('keydown', (event: KeyboardEvent) => {
        if (this.worker && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
          this.worker.postMessage({ type: 'keydown', key: event.key });
        }
      });

      window.addEventListener('mousewheel', (event: Event) => {
        event.preventDefault();
        const scroll = (event as WheelEvent).deltaY;
        
        if (this.worker) {
          this.worker.postMessage({ type: 'keydown', key: scroll > 0 ? 'ArrowDown' : 'ArrowUp' });
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
  monitorSystemStats() {
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
    }
  
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const renderer = (gl as any).getExtension('WEBGL_debug_renderer_info')
      ? (gl as any).getParameter((gl as any).getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)
      : 'Unknown GPU';
  
    const estimateGpuPower = (name: string): number => {
      const scores: { [key: string]: number } = {
        'Apple M2': 95, 'Apple M1': 85, 'Intel': 40, 'NVIDIA': 90, 'AMD': 80, 'ANGLE': 60
      };
      return Object.entries(scores).find(([key]) => name.includes(key))?.[1] ?? 50;
    };
    const gpuScore = estimateGpuPower(renderer);
  
    let lastFrame = performance.now();
    const frameTimes: number[] = [];
    const measureFrame = () => {
      const now = performance.now();
      frameTimes.push(now - lastFrame);
      if (frameTimes.length > 100) frameTimes.shift();
      lastFrame = now;
      requestAnimationFrame(measureFrame);
    };
    measureFrame();
  
    this.loggingInterval = setInterval(() => {
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length || 16.67;
      const gpuLoad = Math.min(100, Math.max(0, ((avgFrameTime - 16) / 17) * 100));
      const finalGpuUsage = ((gpuScore / 100) * gpuLoad).toFixed(2);
  
      const memoryInfo = (performance as any).memory || { usedJSHeapSize: 0, totalJSHeapSize: 1 };
      const memoryUsage = +(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const cpuUsage = (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100;
  
      this.monitorService.logMetrics(cpuUsage, memoryUsage, Number(this.fps), Number(finalGpuUsage));
  
      this.memoryUsage = `${memoryUsage} MB`;
      this.cpuUsage = `${cpuUsage.toFixed(2)}%`;
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
  onShowLines(event: Event) {
    if (this.worker) {
      this.worker.postMessage({
        type: 'toggleLines',
        showLines: (event.target! as HTMLInputElement).checked
      });
    }
  }

  onStartAnimation() {
    this.startAnimation = !this.startAnimation;
    if (this.worker) {
      this.worker.postMessage({
        type: 'toggleAnimation',
        startAnimation: this.startAnimation
      });
    }
  }

  onChangeSpeed(event: Event) {
    this.animationSpeed = (event.target! as HTMLInputElement).value as unknown as number;

    if (this.worker) {
      this.worker.postMessage({
        type: 'changeAnimationSpeed',
        animationSpeed: this.animationSpeed
      });
    }
  }

  reloadPage() {
    window.location.reload();
  }
  
  exportMetricsToCSV(): void {
    this.monitorService.exportToCSV();
  }

  startAddingPlanet() {
    this.isAddingPlanet = true;
    this.newPlanetData = {
      name: `Planet ${Math.floor(Math.random() * 1000)}`,
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

    this.sortPlanetsByDistance();
  }

  toggleShowPlanetsList() {    
    this.showPlanetsList = !this.showPlanetsList;
  }

  followPlanet(planet: any) {
    if (this.worker) {
      this.worker.postMessage({
        type: 'followPlanet',
        planetName: planet.name
      });
    }
  }

  deletePlanet(planet: any) {
    if (this.worker) {
      this.worker.postMessage({
        type: 'deletePlanet',
        planetName: planet.name
      });
    }
    this.planets = this.planets.filter(p => p !== planet);
    this.sortPlanetsByDistance();
  }

  ngOnDestroy() {
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
    }
  }
}
