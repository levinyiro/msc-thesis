import { Component } from '@angular/core';
import { WorkerService } from './workers/worker.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(private workerService: WorkerService) {}

  ngOnInit() {
    const canvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);
    this.workerService.postCanvas(canvas);
  }
}
