import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-fill-questionnaire',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          data.questions.forEach((q: any) => { q.type = this.normalizeType(q.type); });
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

  normalizeType(type: string): string {
    const t = (type || '').toLowerCase().trim();
    if (t === 'rating')                                     return 'rating';
    if (t === 'multiple_choice' || t === 'choix multiple' || t === 'checkbox') return 'checkbox';
    if (t === 'choix unique'    || t === 'radio' || t === 'yes_no')            return 'radio';
    if (t === 'liste déroulante'|| t === 'select')                             return 'select';
    if (t === 'texte libre'     || t === 'text')                               return 'text';
    return 'text';
  }

  parseOptions(opts: string): string[] {
    return opts ? opts.split(',').map(o => o.trim()).filter(o => o) : [];
  }

  ratingRange(opts: string): number[] {
    const nums = this.parseOptions(opts).map(Number).filter(n => !isNaN(n) && n > 0);
    if (nums.length >= 2) {
      const min = Math.min(...nums), max = Math.max(...nums);
      return Array.from({ length: max - min + 1 }, (_, i) => min + i);
    }
    if (nums.length === 1) return Array.from({ length: nums[0] }, (_, i) => i + 1);
    return [1, 2, 3, 4, 5];
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

    // Validate required questions
    const missing = this.questionnaire.questions
      .map((q: any, i: number) => ({ q, i }))
      .filter(({ q, i }: { q: any; i: number }) => q.required && !this.responses[i].answer?.trim());

    if (missing.length > 0) {
      const list = missing.map(({ q, i }: { q: any; i: number }) => `<li><b>Q${i + 1}</b> — ${q.titre}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: 'Questions obligatoires',
        html: `Veuillez répondre aux questions suivantes :<ul style="text-align:left;margin-top:10px;">${list}</ul>`,
        confirmButtonColor: '#27ae60',
        confirmButtonText: 'OK'
      });
      return;
    }

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
