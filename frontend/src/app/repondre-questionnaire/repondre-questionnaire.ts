import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-repondre',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="chargement">Chargement...</div>
    <div *ngIf="!chargement && questionnaire">
      <h2>{{ questionnaire.titre }}</h2>
      <div *ngFor="let q of questionnaire.questions; let i=index">
        <label>{{ q.titre }}</label>
        <div [ngSwitch]="q.type">
          <input *ngSwitchCase="'text'" [(ngModel)]="reponses[i]" type="text">
          <div *ngSwitchCase="'radio'">
            <label *ngFor="let opt of q.options.split(',')">
              <input type="radio" name="q{{i}}" [value]="opt" [(ngModel)]="reponses[i]"> {{ opt }}
            </label>
          </div>
          <div *ngSwitchCase="'checkbox'">
            <label *ngFor="let opt of q.options.split(',')">
              <input type="checkbox" [value]="opt" (change)="toggleCheckbox(i, opt)"> {{ opt }}
            </label>
          </div>
          <select *ngSwitchCase="'select'" [(ngModel)]="reponses[i]">
            <option *ngFor="let opt of q.options.split(',')" [value]="opt">{{ opt }}</option>
          </select>
        </div>
      </div>
      <button (click)="soumettre()">Envoyer mes reponses</button>
    </div>
  `,
  styles: [``]
})
export class RepondreQuestionnaire implements OnInit {
  token = '';
  questionnaire: any = null;
  reponses: any[] = [];
  chargement = true;
  constructor(private route: ActivatedRoute, private http: HttpClient) {}
  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (this.token) {
      this.http.get(`/api/envoi/questionnaire?token=${this.token}`).subscribe((q: any) => {
        this.questionnaire = q;
        this.reponses = new Array(q.questions.length);
        this.chargement = false;
      });
    }
  }
  toggleCheckbox(index: number, value: string) {
    if (!this.reponses[index]) this.reponses[index] = [];
    const arr = this.reponses[index];
    const pos = arr.indexOf(value);
    if (pos === -1) arr.push(value);
    else arr.splice(pos, 1);
  }
  soumettre() {
    const payload = this.questionnaire.questions.map((q: any, idx: number) => ({
      questionId: q.id,
      reponse: Array.isArray(this.reponses[idx]) ? this.reponses[idx].join(',') : this.reponses[idx]
    }));
    this.http.post(`/api/reponses/repondre?token=${this.token}`, payload).subscribe(() => {
      alert('Merci, vos reponses ont ete enregistrees.');
    });
  }
}