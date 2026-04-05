import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-repondre',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './repondre-questionnaire.html',
  styleUrls: ['./repondre-questionnaire.css']
})
export class RepondreQuestionnaire implements OnInit {
  token = '';
  questionnaire: any = null;
  reponses: any[] = [];
  chargement = true;
  erreur = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        const url = `http://localhost:8081/api/envoi/questionnaire?token=${this.token}`;
        this.http.get(url).subscribe({
          next: (q: any) => {
            if (q && (q.questions || q.question)) {
              const questionsArray = q.questions || q.question;
              this.questionnaire = {
                ...q,
                questions: questionsArray
              };
              this.reponses = new Array(questionsArray.length);
              this.chargement = false;
              this.erreur = false;
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

  toggleCheckbox(index: number, value: string) {
    if (!this.reponses[index]) this.reponses[index] = [];
    const arr = this.reponses[index];
    const pos = arr.indexOf(value);
    if (pos === -1) arr.push(value);
    else arr.splice(pos, 1);
  }

  soumettre() {
    const questionsArray = this.questionnaire.questions;
    const payload = questionsArray.map((q: any, idx: number) => ({
      questionId: q.id,
      reponse: Array.isArray(this.reponses[idx]) ? this.reponses[idx].join(', ') : (this.reponses[idx] || '')
    }));
    const url = `http://localhost:8081/api/reponses/repondre?token=${this.token}`;
    this.http.post(url, payload).subscribe({
      next: (response) => {
        alert('Merci, vos réponses ont été enregistrées.');
      },
      error: (err: HttpErrorResponse) => {
        alert('Erreur lors de l\'envoi des réponses. Vérifiez la console.');
      }
    });
  }
}