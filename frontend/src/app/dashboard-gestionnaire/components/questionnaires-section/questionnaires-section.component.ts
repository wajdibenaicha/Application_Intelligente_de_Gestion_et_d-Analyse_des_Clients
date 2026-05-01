import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-questionnaires-section',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './questionnaires-section.component.html'
})
export class QuestionnairesSectionComponent {
  @Input() questionnaires: any[] = [];
  @Input() myOwnQuestionnaires: any[] = [];
  @Input() myTeams: any[] = [];
  @Input() questTab = 'mine';
  @Input() allTeamMembers: any[] = [];
  @Input() canManageAll = false;
  @Input() gestionnaire: any = null;

  @Output() questTabChange = new EventEmitter<string>();
  @Output() openWizard = new EventEmitter<void>();
  @Output() openDelegate = new EventEmitter<void>();
  @Output() viewQuestions = new EventEmitter<any>();
  @Output() editQuest = new EventEmitter<any>();
  @Output() demanderPub = new EventEmitter<any>();
  @Output() retirerDemande = new EventEmitter<any>();
  @Output() approuver = new EventEmitter<number>();
  @Output() rejeter = new EventEmitter<number>();
  @Output() partager = new EventEmitter<any>();
  @Output() delete = new EventEmitter<number>();

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

  questionnairesForTeam(team: any): any[] {
    const memberIds = new Set((team.members || []).map((m: any) => m.id));
    return this.questionnaires.filter(q => memberIds.has(q.gestionnaire?.id));
  }

  private statut(q: any): string {
    return (q?.statut || '').toUpperCase().trim();
  }

  private isMyQuestionnaire(q: any): boolean {
    return q.gestionnaire?.id === this.gestionnaire?.id;
  }

  canEdit(q: any): boolean {
    return this.canManageAll || this.isMyQuestionnaire(q);
  }

  canDelete(q: any): boolean {
    return this.canManageAll || this.isMyQuestionnaire(q);
  }

  canRequestPublication(q: any): boolean {
    const s = this.statut(q);
    return !this.canManageAll && this.isMyQuestionnaire(q) && (s === 'BROUILLON' || s === 'REJETE');
  }

  canWithdraw(q: any): boolean {
    return !this.canManageAll && this.isMyQuestionnaire(q) && this.statut(q) === 'EN_ATTENTE';
  }

  canApprove(q: any): boolean {
    return this.canManageAll && this.statut(q) === 'EN_ATTENTE';
  }

  canReject(q: any): boolean {
    const s = this.statut(q);
    const isDirecteurQ = q?.gestionnaire?.role?.name?.toUpperCase() === 'DIRECTEUR';
    return this.canManageAll && !isDirecteurQ && (s === 'EN_ATTENTE' || s === 'PUBLIE' || s === 'APPROUVE');
  }

  canShare(q: any): boolean {
    const s = this.statut(q);
    return s === 'PUBLIE' || s === 'APPROUVE';
  }
}
