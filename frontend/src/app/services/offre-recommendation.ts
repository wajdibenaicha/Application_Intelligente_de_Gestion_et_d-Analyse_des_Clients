import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OffreRecommendation } from '../models/offre-recommendation';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private url = 'http://localhost:8081/api/recommendations';

  constructor(private http: HttpClient) {}

  generate(clientId: number, questionnaireId: number) {
    return this.http.post<OffreRecommendation>(
      `${this.url}/generate/${clientId}/${questionnaireId}`, {});
  }

  getAll() {
    return this.http.get<OffreRecommendation[]>(`${this.url}`);
  }

  getPending() {
    return this.http.get<OffreRecommendation[]>(`${this.url}/pending`);
  }

  accept(id: number) {
    return this.http.put<OffreRecommendation>(
      `${this.url}/${id}/accept`, {});
  }

  override(id: number, offreId: number) {
    return this.http.put<OffreRecommendation>(
      `${this.url}/${id}/override/${offreId}`, {});
  }

  send(id: number) {
    return this.http.post<OffreRecommendation>(
      `${this.url}/${id}/send`, {});
  }
}
