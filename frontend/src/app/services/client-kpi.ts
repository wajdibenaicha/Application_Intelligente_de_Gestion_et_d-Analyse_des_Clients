import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ClientKpi } from '../models/client-kpi';

@Injectable({ providedIn: 'root' })
export class KpiService {
  private url = 'http://localhost:8081/api/kpi';

  constructor(private http: HttpClient) {}

  calculate(clientId: number, questionnaireId: number) {
    return this.http.post<ClientKpi>(
      `${this.url}/calculate/${clientId}/${questionnaireId}`, {});
  }

  getByClient(clientId: number) {
    return this.http.get<ClientKpi[]>(
      `${this.url}/client/${clientId}`);
  }
}
