import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-questionnaire-details-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './questionnaire-details-modal.component.html'
})
export class QuestionnaireDetailsModalComponent {
  @Input() questionnaire: any = null;
  @Output() closed = new EventEmitter<void>();

  getBadgeClass(): string {
    const q = this.questionnaire;
    if (!q) return 'badge-brouillon';
    const s = (q.statut || '').toUpperCase().trim();
    if (s === 'REJETE') return 'badge-danger';
    if (q.confirmed || s === 'APPROUVE' || s === 'PUBLIE') return 'badge-confirmed';
    if (s === 'EN_ATTENTE') return 'badge-pending';
    return 'badge-brouillon';
  }

  getStatutLabel(): string {
    const q = this.questionnaire;
    if (!q) return '';
    const s = (q.statut || '').toUpperCase().trim();
    if (s === 'REJETE') return 'Rejeté';
    if (q.confirmed || s === 'APPROUVE' || s === 'PUBLIE') return 'Approuvé';
    if (s === 'EN_ATTENTE') return 'En attente';
    return 'Brouillon';
  }
}
