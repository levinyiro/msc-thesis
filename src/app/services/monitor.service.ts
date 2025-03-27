// src/app/services/monitor.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private readonly STORAGE_KEY = 'performanceMetrics';
  private maxDataPoints = 60; // Store up to 60 data points (1 minute at 1-second intervals)

  constructor() {}

  logMetrics(cpu: number, memory: number, fps: number): void {
    // Get existing data or initialize
    const existingData = this.getMetrics();
    
    // Add new data
    existingData.cpu.push(cpu);
    existingData.memory.push(memory);
    existingData.fps.push(fps);
    
    // Trim arrays if they exceed max length
    if (existingData.cpu.length > this.maxDataPoints) {
      existingData.cpu.shift();
      existingData.memory.shift();
      existingData.fps.shift();
    }
    
    // Save to localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingData));
  }

  getMetrics(): { cpu: number[]; memory: number[]; fps: number[] } {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : { cpu: [], memory: [], fps: [] };
  }

  clearMetrics(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}