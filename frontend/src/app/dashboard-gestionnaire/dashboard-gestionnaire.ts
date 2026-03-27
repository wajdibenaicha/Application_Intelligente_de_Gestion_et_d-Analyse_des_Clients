import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-gestionnaire',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './dashboard-gestionnaire.html',
  styleUrl: './dashboard-gestionnaire.css'
})
export class DashboardGestionnaire implements OnInit {

  private apiUrl = 'http://localhost:8081/api';

  activeSection = 'home';
  sidebarCollapsed = false;
  isLoading = false;
  showToast = false;
  toastMessage = '';
  toastType = 'success';
  today = new Date();

  gestionnaire: any = null;

  questionnaires: any[] = [];
  showCreateForm = false;
  showEditForm = false;
  showQuestionsView = false;
  selectedQuestionnaire: any = null;
  editingQuestionnaire: any = null;

  newQuestionnaire: any = { titre: '', description: '', questions: [] };

  reponses: any[] = [];
  selectedQuestionnaireId = '';

  offresIA: any[] = [];

  totalQuestionnaires = 0;
  pendingCount = 0;
  publishedCount = 0;
  totalReponses = 0;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    const user = sessionStorage.getItem('user');
    const role = sessionStorage.getItem('role');
    if (!user || role !== 'gestionnaire') {
      this.router.navigate(['/login']);
      return;
    }
    this.gestionnaire = JSON.parse(user);
    this.loadQuestionnaires();
    this.loadOffresIA();
    setTimeout(() => {
      this.loadQuestionnaires();
      this.cdr.detectChanges();
    }, 500);
  }

  setSection(section: string) {
    this.activeSection = section;
    this.cancelForm();
  }

  getSectionTitle(): string {
    const titles: any = {
      home: 'Tableau de bord',
      questionnaires: 'Mes Questionnaires',
      reponses: 'Réponses des clients',
      offres: 'Recommandations IA'
    };
    return titles[this.activeSection] || '';
  }

  toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed; }

  getInitials(): string {
    if (!this.gestionnaire?.fullName) return 'G';
    return this.gestionnaire.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  loadQuestionnaires() {
    this.http.get<any[]>(`${this.apiUrl}/questionnaires/gestionnaire/${this.gestionnaire.id}`).subscribe({
      next: (data) => {
        this.questionnaires = data;
        this.totalQuestionnaires = data.length;
        this.pendingCount = data.filter(q => q.statut === 'EN_ATTENTE').length;
        this.publishedCount = data.filter(q => q.statut === 'PUBLIE').length;
        this.cdr.detectChanges();
      },
      error: () => this.toast('Erreur chargement questionnaires', 'error')
    });
  }

  openCreateQuestionnaire() {
    this.newQuestionnaire = { titre: '', description: '', questions: [] };
    this.showCreateForm = true;
    this.showEditForm = false;
    this.showQuestionsView = false;
    this.activeSection = 'questionnaires';
  }

  addNewQuestion() {
    this.newQuestionnaire.questions.push({ titre: '', type: 'input' });
  }

  removeQuestion(index: number) {
    this.newQuestionnaire.questions.splice(index, 1);
  }

  saveQuestionnaire() {
    if (!this.newQuestionnaire.titre) { this.toast('Veuillez saisir un titre', 'error'); return; }
    this.isLoading = true;
    const payload = {
      titre: this.newQuestionnaire.titre,
      description: this.newQuestionnaire.description,
      gestionnaire: { id: this.gestionnaire.id },
      questions: this.newQuestionnaire.questions
    };
    this.http.post<any>(`${this.apiUrl}/questionnaires`, payload).subscribe({
      next: (newQ) => {
        this.isLoading = false;
        this.questionnaires = [...this.questionnaires, newQ];
        this.totalQuestionnaires = this.questionnaires.length;
        this.showCreateForm = false;
        this.cdr.detectChanges();
        this.toast('Questionnaire crée');
      },
      error: () => { this.isLoading = false; this.toast('Erreur création', 'error'); }
    });
  }

  editQuestionnaire(q: any) {
    this.editingQuestionnaire = { ...q, questions: [...(q.questions || [])] };
    this.showEditForm = true;
    this.showCreateForm = false;
    this.showQuestionsView = false;
  }

  addQuestionToEdit() {
    this.editingQuestionnaire.questions.push({ titre: '', type: 'input' });
  }

  removeQuestionEdit(index: number) {
    this.editingQuestionnaire.questions.splice(index, 1);
  }

  updateQuestionnaire() {
    this.isLoading = true;
    this.http.put<any>(`${this.apiUrl}/questionnaires/${this.editingQuestionnaire.id}`, this.editingQuestionnaire).subscribe({
      next: (updated) => {
        this.isLoading = false;
        this.questionnaires = this.questionnaires.map((q: any) =>
          q.id === updated.id ? updated : q
        );
        this.questionnaires = [...this.questionnaires];
        this.showEditForm = false;
        this.cdr.detectChanges();
        this.toast('Questionnaire mis à jour');
      },
      error: () => { this.isLoading = false; this.toast('Erreur mise à jour', 'error'); }
    });
  }

  deleteQuestionnaire(id: number) {
    if (!confirm('Supprimer ce questionnaire ?')) return;
    this.http.delete(`${this.apiUrl}/questionnaires/${id}`).subscribe({
      next: () => {
        this.questionnaires = this.questionnaires.filter(q => q.id !== id);
        this.loadQuestionnaires();
        this.toast('Questionnaire supprimé');
      },
      error: () => this.toast('Erreur suppression', 'error')
    });
  }

  demanderPublication(q: any) {
    if (!confirm(`Envoyer une demande pour "${q.titre}" ?`)) return;
    this.http.put(`${this.apiUrl}/questionnaires/${q.id}/demander-publication`, {}).subscribe({
      next: () => { this.loadQuestionnaires(); this.toast("Demande envoyée à l'administrateur 📤"); },
      error: () => this.toast('Erreur', 'error')
    });
  }

  viewQuestions(q: any) {
    this.selectedQuestionnaire = q;
    this.showQuestionsView = true;
    this.showCreateForm = false;
    this.showEditForm = false;
  }

  deleteQuestion(questionId: number, questionnaire: any) {
    if (!confirm('Supprimer cette question ?')) return;
    this.http.delete(`${this.apiUrl}/questions/${questionId}`).subscribe({
      next: () => {
        questionnaire.questions = questionnaire.questions.filter((q: any) => q.id !== questionId);
        this.selectedQuestionnaire = null;
        setTimeout(() => {
          this.selectedQuestionnaire = questionnaire;
          this.cdr.detectChanges();
        }, 0);
        this.toast('Question supprimée');
      },
      error: () => this.toast('Erreur suppression question', 'error')
    });
  }

  cancelForm() {
    this.showCreateForm = false;
    this.showEditForm = false;
    this.showQuestionsView = false;
  }

  getBadgeClass(statut: string): string {
    const map: any = {
      'BROUILLON': 'badge-brouillon',
      'EN_ATTENTE': 'badge-pending',
      'PUBLIE': 'badge-published',
      'REJETE': 'badge-danger'
    };
    return map[statut] || 'badge-brouillon';
  }

  loadReponses() {
    if (!this.selectedQuestionnaireId) return;
    this.http.get<any[]>(`${this.apiUrl}/reponses/questionnaire/${this.selectedQuestionnaireId}`).subscribe({
      next: (data) => { this.reponses = data; this.totalReponses = data.length; },
      error: () => this.toast('Erreur chargement réponses', 'error')
    });
  }

  loadOffresIA() {
    this.http.get<any[]>(`${this.apiUrl}/offres`).subscribe({
      next: (data) => { this.offresIA = data.map(o => ({ ...o, showManualForm: false })); },
      error: () => {}
    });
  }

  accepterOffre(offre: any) {
    this.http.put(`${this.apiUrl}/offres/${offre.id}/accepter`, {}).subscribe({
      next: () => { offre.statut = 'ACCEPTE'; this.toast('Offre acceptée ✅'); },
      error: () => this.toast('Erreur', 'error')
    });
  }

  rejeterOffre(offre: any) {
    offre.statut = 'REJETE';
    offre.showManualForm = true;
    this.http.put(`${this.apiUrl}/offres/${offre.id}/rejeter`, {}).subscribe();
  }

  soumettreManualle(offre: any) {
    if (!offre.offreManuelle) { this.toast('Veuillez saisir votre offre', 'error'); return; }
    this.http.put(`${this.apiUrl}/offres/${offre.id}/manuelle`, { offreManuelle: offre.offreManuelle }).subscribe({
      next: () => { offre.showManualForm = false; this.toast('Offre soumise ✅'); },
      error: () => this.toast('Erreur', 'error')
    });
  }

  toast(message: string, type = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 3000);
  }
}