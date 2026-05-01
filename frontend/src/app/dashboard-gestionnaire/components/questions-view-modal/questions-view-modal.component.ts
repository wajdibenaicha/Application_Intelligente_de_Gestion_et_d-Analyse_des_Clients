import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-questions-view-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './questions-view-modal.component.html'
})
export class QuestionsViewModalComponent {
  @Input() questionnaire: any = null;
  @Input() canManageAll = false;
  @Input() gestionnaire: any = null;
  @Output() closed = new EventEmitter<void>();
  @Output() edit = new EventEmitter<any>();
  @Output() requestPublication = new EventEmitter<any>();
  @Output() approve = new EventEmitter<number>();
  @Output() reject = new EventEmitter<number>();
  @Output() deleteQuestion = new EventEmitter<{ questionId: number; questionnaire: any }>();

  getBadgeClass(statut: string): string {
    const s = (statut || '').toUpperCase().trim();
    if (s === 'BROUILLON') return 'badge-brouillon';
    if (s === 'EN_ATTENTE') return 'badge-pending';
    if (s === 'PUBLIE' || s === 'APPROUVE') return 'badge-published';
    if (s === 'REJETE') return 'badge-danger';
    return 'badge-brouillon';
  }

  getStatutLabel(statut: string): string {
    const s = (statut || '').toUpperCase().trim();
    if (s === 'BROUILLON') return 'Brouillon';
    if (s === 'EN_ATTENTE') return 'En attente';
    if (s === 'PUBLIE' || s === 'APPROUVE') return 'Approuvé';
    if (s === 'REJETE') return 'Rejeté';
    return 'Brouillon';
  }

  getOptionsArray(options: string): string[] {
    if (!options || !options.trim()) return [];
    return options.split(',').map(o => o.trim()).filter(o => o !== '');
  }

  private statut(q: any): string {
    return (q?.statut || '').toUpperCase().trim();
  }

  canEdit(): boolean {
    if (!this.questionnaire) return false;
    return this.canManageAll || this.questionnaire.gestionnaire?.id === this.gestionnaire?.id;
  }

  canRequestPublication(): boolean {
    if (!this.questionnaire) return false;
    const s = this.statut(this.questionnaire);
    return !this.canManageAll &&
      this.questionnaire.gestionnaire?.id === this.gestionnaire?.id &&
      (s === 'BROUILLON' || s === 'REJETE');
  }

  canApprove(): boolean {
    if (!this.questionnaire) return false;
    return this.canManageAll && this.statut(this.questionnaire) === 'EN_ATTENTE';
  }

  canReject(): boolean {
    if (!this.questionnaire) return false;
    const s = this.statut(this.questionnaire);
    const isDirecteurQ = this.questionnaire?.gestionnaire?.role?.name?.toUpperCase() === 'DIRECTEUR';
    return this.canManageAll && !isDirecteurQ &&
      (s === 'EN_ATTENTE' || s === 'PUBLIE' || s === 'APPROUVE');
  }
}
