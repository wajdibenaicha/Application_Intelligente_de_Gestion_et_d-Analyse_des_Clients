import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-questionnaires-section',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './questionnaires-section.component.html'
})
export class AdminQuestionnairesSectionComponent {
  @Input() questionnaires: any[] = [];
  @Input() gestionnaire: any[] = [];
  @Input() totalReponsesCount = 0;
  @Input() offres: any[] = [];

  @Output() viewDetails = new EventEmitter<any>();

  getBadgeClass(q: any): string {
    const s = (q.statut || '').toUpperCase().trim();
    if (s === 'REJETE') return 'badge-danger';
    if (q.confirmed || s === 'APPROUVE' || s === 'PUBLIE') return 'badge-confirmed';
    if (s === 'EN_ATTENTE') return 'badge-pending';
    return 'badge-brouillon';
  }

  getStatutLabel(q: any): string {
    const s = (q.statut || '').toUpperCase().trim();
    if (s === 'REJETE') return 'Rejeté';
    if (q.confirmed || s === 'APPROUVE' || s === 'PUBLIE') return 'Approuvé';
    if (s === 'EN_ATTENTE') return 'En attente';
    return 'Brouillon';
  }
}
