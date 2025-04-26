import { Injectable } from "@angular/core";
import planets  from '../data/planets.json';

@Injectable({
    providedIn: 'root'
})
export class DataService {
    constructor() {}
  
    getMercuryData(): any {
      return planets.mercury;
    }

    getVenusData(): any {
      return planets.venus;
    }

    getEarthData(): any {
      return planets.earth;
    }

    getMarsData(): any {
      return planets.mars;
    }

    getJupiterData(): any {
      return planets.jupiter;
    }

    getSaturnData(): any {
      return planets.saturn;
    }

    getUranusData(): any {
      return planets.uranus;
    }

    getNeptuneData(): any {
      return planets.neptune;
    }
}