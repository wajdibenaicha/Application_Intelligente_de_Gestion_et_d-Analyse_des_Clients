import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-fill-questionnaire',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './fill-questionnaire.html',
  styleUrl: './fill-questionnaire.css'
})
export class FillQuestionnaireComponent implements OnInit {
  questionnaire: any = null;
  responses: { questionId: number; answer: string }[] = [];
  submitted = false;
  error = '';
  loading = true;
  submitting = false;
  private token = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.error = 'Lien invalide ou expiré.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.http.get<any>('/api/public/questionnaire?token=' + encodeURIComponent(this.token))
      .subscribe({
        next: (data) => {
          this.questionnaire = data;
          this.responses = data.questions.map((q: any) => ({ questionId: q.id, answer: '' }));
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err.error?.error || 'Ce lien est invalide ou a déjà été utilisé.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  parseOptions(opts: string): string[] {
    return opts ? opts.split(',').map(o => o.trim()).filter(o => o) : [];
  }

  isChecked(i: number, opt: string): boolean {
    return this.responses[i].answer.split(',').includes(opt);
  }

  toggleCheckbox(i: number, opt: string) {
    const selected = this.responses[i].answer
      ? this.responses[i].answer.split(',').filter(o => o)
      : [];
    const idx = selected.indexOf(opt);
    if (idx > -1) selected.splice(idx, 1);
    else selected.push(opt);
    this.responses[i].answer = selected.join(',');
  }

  submit() {
    if (this.submitting) return;
    this.submitting = true;
    this.cdr.detectChanges();

    this.http.post<any>('/api/public/questionnaire/submit',
      { token: this.token, responses: this.responses }
    ).subscribe({
      next: () => {
        this.submitted = true;
        this.submitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        this.submitting = false;
        this.cdr.detectChanges();
      }
    });
  }
}
