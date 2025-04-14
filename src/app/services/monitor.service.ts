// src/app/services/monitor.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private readonly STORAGE_KEY = 'performanceMetrics';
  private maxDataPoints = 60;

  constructor() {
    this.clearMetrics();
  }

  logMetrics(cpu: number, memory: number, fps: number, gpu: number): void {
    const existingData = this.getMetrics();
    
    existingData.cpu.push(cpu);
    existingData.memory.push(memory);
    existingData.fps.push(fps);
    existingData.gpu.push(gpu);
    
    if (existingData.cpu.length > this.maxDataPoints) {
      existingData.cpu.shift();
      existingData.memory.shift();
      existingData.fps.shift();
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingData));
  }

  getMetrics(): { cpu: number[]; memory: number[]; fps: number[], gpu: number[] } {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : { cpu: [], memory: [], fps: [], gpu: [] };
  }

  clearMetrics(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  exportToCSV(): void {
    const data = this.getMetrics();
    if (data.cpu.length === 0) {
      alert('No metrics data available to export');
      return;
    }

    let csv = 'Timestamp,CPU (%),Memory (MB),FPS,GPU (%)\n';
    
    for (let i = 0; i < data.cpu.length; i++) {
      const timestamp = new Date(Date.now() - (data.cpu.length - i - 1) * 1000).toISOString();
      csv += `${timestamp},${data.cpu[i]},${data.memory[i]},${data.fps[i]},${data.gpu[i] || 'N/A'}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `performance_metrics_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.clearMetrics();
  }
}