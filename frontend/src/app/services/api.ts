import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Api {
private base = 'http://localhost:8081/api';
  constructor(private http: HttpClient) {}
  getGestionnaires(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/gestionnaires`);}
  addGestionnaire(gestionnaire: any): Observable<any> { return this.http.post<any>(`${this.base}/gestionnaires`, gestionnaire);}
  deleteGestionnaire(id: number): Observable<any> { return this.http.delete<any>(`${this.base}/gestionnaires/${id}`);}
  updateGestionnaire(id: number, gestionnaire: any): Observable<any> { return this.http.put<any>(`${this.base}/gestionnaires/${id}`, gestionnaire);}

  getQuestionnaires(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/questionnaires`);}
  addQuestionnaire(questionnaire: any): Observable<any> { return this.http.post<any>(`${this.base}/questionnaires`, questionnaire);}
  deleteQuestionnaire(id: number): Observable<any> { return this.http.delete<any>(`${this.base}/questionnaires/${id}`);}
  updateQuestionnaire(id: number, questionnaire: any): Observable<any> { return this.http.put<any>(`${this.base}/questionnaires/${id}`, questionnaire);}
  confirmQuestionnaire(id: number): Observable<any> { return this.http.post<any>(`${this.base}/questionnaires/${id}/confirm`, {});}

  getQuestions(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/questions`);}
  addQuestion(question: any): Observable<any> { return this.http.post<any>(`${this.base}/questions`, question);}
  deleteQuestion(id: number): Observable<any> { return this.http.delete<any>(`${this.base}/questions/${id}`);}

  getResponses(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/reponses`);}
  deleteResponse(id: number): Observable<any> { return this.http.delete<any>(`${this.base}/reponses/${id}`); } 
  
  getroles(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/roles`);}
  addrole(role: any): Observable<any> { return this.http.post<any>(`${this.base}/roles`, role);}
  deleterole(id: number): Observable<any> { return this.http.delete<any>(`${this.base}/roles/${id}`); }
  updaterole(id: number, role: any): Observable<any> { return this.http.put<any>(`${this.base}/roles/${id}`, role); }

  getpermissions(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/permissions`);}
  addpermission(permission: any): Observable<any> { return this.http.post<any>(`${this.base}/permissions`, permission);}
  deletepermission(id: number): Observable<any> { return this.http.delete<any>(`${this.base}/permissions/${id}`); }
  updatepermission(id: number, permission: any): Observable<any> { return this.http.put<any>(`${this.base}/permissions/${id}`, permission); }

  getoffres(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/offres`);}
  addoffre(offre: any): Observable<any> { return this.http.post<any>(`${this.base}/offres`, offre);}
  deleteoffre(id: number): Observable<any> { return this.http.delete<any>(`${this.base}/offres/${id}`); }
  updateoffre(id: number, offre: any): Observable<any> { return this.http.put<any>(`${this.base}/offres/${id}`, offre); }


}
