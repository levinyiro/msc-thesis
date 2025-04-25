import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private apiUrl = 'https://api.le-systeme-solaire.net/rest.php/bodies';

    constructor(private http: HttpClient) {}
  
    getMercuryData(): Observable<any> {
      return this.http.get<any>(this.apiUrl + '/mercury');
    }

    getVenusData(): Observable<any> {
      return this.http.get<any>(this.apiUrl + '/venus');
    }

    getEarthData(): Observable<any> {
      return this.http.get<any>(this.apiUrl + '/terre');
    }

    getMarsData(): Observable<any> {
      return this.http.get<any>(this.apiUrl + '/mars');
    }

    getJupiterData(): Observable<any> {
      return this.http.get<any>(this.apiUrl + '/jupiter');
    }

    getSaturnData(): Observable<any> {
      return this.http.get<any>(this.apiUrl + '/saturne');
    }

    getUranusData(): Observable<any> {
      return this.http.get<any>(this.apiUrl + '/uranus');
    }

    getNeptuneData(): Observable<any> {
      return this.http.get<any>(this.apiUrl + '/neptune');
    }
}