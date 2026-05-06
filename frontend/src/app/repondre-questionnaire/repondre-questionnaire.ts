import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-repondre',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './repondre-questionnaire.html',
  styleUrls: ['./repondre-questionnaire.css']
})
export class RepondreQuestionnaire implements OnInit {
  Math = Math;
  token = '';
  questionnaire: any = null;
  reponses: any[] = [];
  chargement = true;
  erreur = false;
  soumis = false;
  envoi = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        this.http.get(`${environment.apiUrl}/envoi/questionnaire?token=${this.token}`).subscribe({
          next: (q: any) => {
            if (q && (q.questions || q.question)) {
              const questionsArray = q.questions || q.question;
              this.questionnaire = { ...q, questions: questionsArray };
              this.reponses = new Array(questionsArray.length).fill(null).map(() => null);
              this.chargement = false;
            } else {
              this.chargement = false;
              this.erreur = true;
            }
            this.cdr.detectChanges();
          },
          error: () => {
            this.chargement = false;
            this.erreur = true;
            this.cdr.detectChanges();
          }
        });
      } else {
        this.chargement = false;
        this.erreur = true;
        this.cdr.detectChanges();
      }
    });
  }

  getOptions(q: any): string[] {
    return q.options ? q.options.split(',').map((o: string) => o.trim()).filter((o: string) => o) : [];
  }

  toggleCheckbox(index: number, value: string) {
    if (!Array.isArray(this.reponses[index])) this.reponses[index] = [];
    const arr = this.reponses[index];
    const pos = arr.indexOf(value);
    if (pos === -1) arr.push(value);
    else arr.splice(pos, 1);
  }

  isChecked(index: number, value: string): boolean {
    return Array.isArray(this.reponses[index]) && this.reponses[index].includes(value);
  }

  get progression(): number {
    if (!this.questionnaire) return 0;
    const total = this.questionnaire.questions.length;
    const done = this.reponses.filter(r => r !== null && r !== '' && !(Array.isArray(r) && r.length === 0)).length;
    return Math.round((done / total) * 100);
  }

  soumettre() {
    this.envoi = true;
    const payload = this.questionnaire.questions.map((q: any, idx: number) => ({
      questionId: q.id,
      reponse: Array.isArray(this.reponses[idx]) ? this.reponses[idx].join(', ') : (this.reponses[idx] || '')
    }));
    this.http.post(`${environment.apiUrl}/reponses/repondre?token=${this.token}`, payload).subscribe({
      next: () => { this.soumis = true; this.envoi = false; this.cdr.detectChanges(); },
      error: () => { this.envoi = false; this.cdr.detectChanges(); }
    });
  }
}
