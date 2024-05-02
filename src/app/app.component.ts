import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  worker?: Worker;

  constructor() {}

  ngOnInit() {
    const canvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);


  }

  ngAfterViewInit() {
    this.worker = new Worker(new URL('./_workers/threejs.worker.ts', import.meta.url));
    this.worker.onmessage = ( ({ data }) => {
      console.log('Message from worker:', data);
    });
    this.worker.onerror = (error) => {
      console.log('Worker error', error);
    };
  }
}
