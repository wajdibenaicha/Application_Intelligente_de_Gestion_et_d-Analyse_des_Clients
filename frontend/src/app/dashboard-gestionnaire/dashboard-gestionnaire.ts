import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { WebSocketService } from '../services/websocket.service';
import { Api } from '../services/api';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard-gestionnaire',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  permission = '';

  questionnaires: any[] = [];
  showQuestionsView = false;
  selectedQuestionnaire: any = null;

  newQuestionnaire: any = { titre: '', description: '', questions: [] };

  reponses: any[] = [];
  selectedQuestionnaireId = '';

  offresIA: any[] = [];

  totalQuestionnaires = 0;
  pendingCount = 0;
  publishedCount = 0;
  totalReponses = 0;

  showquestform = false;
  editingquest: any = null;
  questform: any = { titre: '', description: '', questions: [] };
  questions: any[] = [];
  showaddquestion = false;
  newquest: any = { titre: '', type: 'text', options: '' };
  selectedquestion: any[] = [];
  dragoverIndex = -1;

  showPartageModal = false;
  clientsFiltres: any[] = [];
  filtre = { typeContrat: '', anneeMin: null, profession: '' };

  notifications: any[] = [];
  unreadNotifCount = 0;
  showNotifPanel = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private wsService: WebSocketService,
    private api: Api
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
    this.permission = this.gestionnaire?.role?.permission?.description || '';

    this.wsService.connect();
    this.wsService.questionnaires$.subscribe(data => {
      this.questionnaires = data.map(q => this.mapStatut(q));
      this.updateStats();
      this.cdr.detectChanges();
    });
    this.wsService.question$.subscribe(data => { this.questions = data; });

    if (this.canManageAll()) {
      this.wsService.adminNotifications$.subscribe(data => {
        this.notifications = data;
        this.unreadNotifCount = data.filter((n: any) => !n.vue).length;
        this.cdr.detectChanges();
      });
      this.loadNotifications();
    }

    this.loadQuestionnaires();
    this.loadOffresIA();
    this.http.get<any[]>(this.apiUrl + '/questions').subscribe({
      next: (data) => { this.questions = data; },
      error: () => {}
    });
  }

  canManageAll(): boolean {
    return this.permission === 'DIRECTEUR';
  }

  setSection(section: string) {
    this.activeSection = section;
    this.showQuestionsView = false;
    if (section === 'reponses') {
      this.reponses = [];
      this.selectedQuestionnaireId = '';
    }
  }

  getSectionTitle() {
    if (this.activeSection === 'home') return 'Tableau de bord';
    if (this.activeSection === 'questionnaires') return 'Questionnaires';
    if (this.activeSection === 'reponses') return 'Réponses des clients';
    if (this.activeSection === 'offres') return 'Recommandations IA';
    return '';
  }

  toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleNotifPanel() { this.showNotifPanel = !this.showNotifPanel; }

  getInitials() {
    if (!this.gestionnaire?.fullName) return 'G';
    const parts = this.gestionnaire.fullName.split(' ');
    let initials = '';
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length > 0) initials += parts[i][0].toUpperCase();
      if (initials.length === 2) break;
    }
    return initials;
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  private mapStatut(q: any): any {
    if (!q.statut || q.statut === '') {
      q.statut = q.confirmed === true ? 'PUBLIE' : 'BROUILLON';
    }
    return q;
  }

  private updateStats() {
    const mine = this.canManageAll()
      ? this.questionnaires
      : this.questionnaires.filter(q => q.gestionnaire?.id === this.gestionnaire.id);
    this.totalQuestionnaires = mine.length;
    this.pendingCount = mine.filter(q => q.statut === 'EN_ATTENTE').length;
    this.publishedCount = mine.filter(q => q.statut === 'PUBLIE').length;
  }

  loadQuestionnaires() {
    const url = this.canManageAll()
      ? this.apiUrl + '/questionnaires'
      : this.apiUrl + '/questionnaires/gestionnaire/' + this.gestionnaire.id;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.questionnaires = data.map(q => this.mapStatut(q));
        this.updateStats();
        this.cdr.detectChanges();
      },
      error: () => this.showToastMessage('Erreur lors du chargement des questionnaires', 'error')
    });
  }

  loadNotifications() {
    this.api.getNotifications().subscribe({
      next: (data: any[]) => {
        this.notifications = data;
        this.unreadNotifCount = data.filter(n => !n.vue).length;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  approuverQuestionnaire(id: number) {
    this.api.approuverPublication(id).subscribe({
      next: () => {
        this.loadQuestionnaires();
        this.loadNotifications();
        this.showNotifPanel = false;
        this.showToastMessage('Questionnaire approuvé et publié');
      },
      error: () => this.showToastMessage('Erreur lors de l\'approbation', 'error')
    });
  }

  rejeterQuestionnaire(id: number) {
    Swal.fire({
      title: 'Rejeter la demande',
      input: 'textarea',
      inputLabel: 'Motif du rejet',
      inputPlaceholder: 'Expliquez pourquoi ce questionnaire est rejeté...',
      showCancelButton: true,
      confirmButtonText: 'Rejeter',
      cancelButtonText: 'Annuler',
      inputValidator: (value) => {
        if (!value) {
          return 'Vous devez saisir un motif';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.api.rejeterPublication(id, result.value).subscribe({
          next: () => {
            this.loadQuestionnaires();
            this.loadNotifications();
            this.showNotifPanel = false;
            this.showToastMessage('Demande rejetée', 'error');
          },
          error: () => this.showToastMessage('Erreur lors du rejet', 'error')
        });
      }
    });
  }

  openCreateQuestionnaire() {
    this.editingquest = null;
    this.selectedquestion = [];
    this.questform = { titre: '', description: '', questions: [] };
    this.showquestform = true;
    this.activeSection = 'questionnaires';
  }

  editQuestionnaire(q: any) {
    this.editingquest = q;
    this.questform = {
      titre: q.titre,
      description: q.description,
      questions: q.questions ? q.questions.map((item: any) => item.id) : []
    };
    this.selectedquestion = q.questions ? [...q.questions] : [];
    this.showquestform = true;
  }

  savequestionnaire() {
    this.questform.questions = this.selectedquestion;
    if (this.editingquest) {
      const payload = {
        titre: this.questform.titre,
        description: this.questform.description,
        questions: this.selectedquestion
      };
      this.http.put<any>(this.apiUrl + '/questionnaires/' + this.editingquest.id, payload).subscribe({
        next: () => {
          this.showquestform = false;
          this.loadQuestionnaires();
          this.showToastMessage('Questionnaire mis à jour');
        },
        error: () => this.showToastMessage('Erreur lors de la mise à jour', 'error')
      });
    } else {
      const payload = {
        titre: this.questform.titre,
        description: this.questform.description,
        gestionnaire: { id: this.gestionnaire.id },
        questions: this.selectedquestion
      };
      this.http.post<any>(this.apiUrl + '/questionnaires', payload).subscribe({
        next: () => {
          this.showquestform = false;
          this.loadQuestionnaires();
          this.showToastMessage('Questionnaire créé avec succès');
        },
        error: () => this.showToastMessage('Erreur lors de la création', 'error')
      });
    }
  }

  deleteQuestionnaire(id: number) {
    if (!confirm('Supprimer ce questionnaire ?')) return;
    this.http.delete(this.apiUrl + '/questionnaires/' + id).subscribe({
      next: () => {
        this.loadQuestionnaires();
        this.showToastMessage('Questionnaire supprimé');
      },
      error: () => this.showToastMessage('Erreur lors de la suppression', 'error')
    });
  }

  demanderPublication(q: any) {
    if (!confirm('Envoyer "' + q.titre + '" pour publication ?')) return;
    this.api.demanderPublication(q.id, this.gestionnaire.id).subscribe({
      next: () => {
        this.loadQuestionnaires();
        this.showToastMessage('Demande envoyée');
      },
      error: () => this.showToastMessage('Erreur lors de l\'envoi', 'error')
    });
  }

  retirerDemande(q: any) {
    if (!confirm('Retirer la demande de publication ?')) return;
    this.api.retirerDemande(q.id).subscribe({
      next: () => {
        this.loadQuestionnaires();
        this.showToastMessage('Demande retirée');
      },
      error: () => this.showToastMessage('Erreur', 'error')
    });
  }

  viewQuestions(q: any) {
    this.selectedQuestionnaire = q;
    this.showQuestionsView = true;
  }

  deleteQuestion(questionId: number, questionnaire: any) {
    if (!confirm('Supprimer cette question ?')) return;
    this.http.delete(this.apiUrl + '/questions/' + questionId).subscribe({
      next: () => {
        questionnaire.questions = questionnaire.questions.filter((q: any) => q.id !== questionId);
        this.selectedQuestionnaire = { ...questionnaire };
        this.questionnaires = this.questionnaires.map((item: any) =>
          item.id === questionnaire.id ? { ...questionnaire } : item
        );
        this.cdr.detectChanges();
        this.showToastMessage('Question supprimée');
      },
      error: () => this.showToastMessage('Erreur lors de la suppression', 'error')
    });
  }

  getBadgeClass(statut: string) {
    if (statut === 'BROUILLON') return 'badge-brouillon';
    if (statut === 'EN_ATTENTE') return 'badge-pending';
    if (statut === 'PUBLIE') return 'badge-published';
    if (statut === 'REJETE') return 'badge-danger';
    return 'badge-brouillon';
  }

  getStatutLabel(statut: string) {
    if (statut === 'BROUILLON') return 'Brouillon';
    if (statut === 'EN_ATTENTE') return 'En attente';
    if (statut === 'PUBLIE') return 'Publié';
    if (statut === 'REJETE') return 'Rejeté';
    return statut;
  }

  isMyQuestionnaire(q: any): boolean {
    return q.gestionnaire?.id === this.gestionnaire?.id;
  }

  canEdit(q: any): boolean {
    if (this.canManageAll()) return q.statut !== 'PUBLIE';
    return this.isMyQuestionnaire(q) && q.statut === 'BROUILLON';
  }

  canDelete(q: any): boolean {
    if (this.canManageAll()) return q.statut !== 'PUBLIE';
    return this.isMyQuestionnaire(q) && q.statut === 'BROUILLON';
  }

  canRequestPublication(q: any): boolean {
    return !this.canManageAll() && this.isMyQuestionnaire(q) && q.statut === 'BROUILLON';
  }

  canWithdraw(q: any): boolean {
    return !this.canManageAll() && this.isMyQuestionnaire(q) && q.statut === 'EN_ATTENTE';
  }

  canApprove(q: any): boolean {
    return this.canManageAll() && q.statut === 'EN_ATTENTE';
  }

  canShare(q: any): boolean {
    return q.statut === 'PUBLIE';
  }

  loadReponses() {
    if (!this.selectedQuestionnaireId) { this.reponses = []; return; }
    this.http.get<any[]>(this.apiUrl + '/reponses/questionnaire/' + this.selectedQuestionnaireId).subscribe({
      next: (data) => {
        this.reponses = data;
        this.totalReponses = data.length;
        this.cdr.detectChanges();
      },
      error: () => this.showToastMessage('Erreur lors du chargement des réponses', 'error')
    });
  }

  exportReponsesCSV() {
    if (this.reponses.length === 0) { this.showToastMessage('Aucune réponse à exporter', 'error'); return; }
    let nomFichier = 'questionnaire';
    for (let i = 0; i < this.questionnaires.length; i++) {
      if (this.questionnaires[i].id == this.selectedQuestionnaireId) {
        nomFichier = this.questionnaires[i].titre.replace(/ /g, '_');
        break;
      }
    }
    const date = new Date();
    const jour = String(date.getDate()).padStart(2, '0');
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const annee = date.getFullYear();
    let lignes = 'Email client;Téléphone;Question;Type de question;Réponse\r\n';
    for (let i = 0; i < this.reponses.length; i++) {
      const r = this.reponses[i];
      lignes += '"' + (r.client?.mail || '') + '";"' + (r.client?.tel || '') + '";"' +
        (r.question?.titre || '') + '";"' + (r.question?.type || '') + '";"' + (r.reponse || '') + '"\r\n';
    }
    const blob = new Blob(['\uFEFF' + lignes], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'reponses_' + nomFichier + '_' + jour + '-' + mois + '-' + annee + '.csv';
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(url);
    this.showToastMessage('Export CSV téléchargé');
  }

  loadOffresIA() {
    this.http.get<any[]>(this.apiUrl + '/offres').subscribe({
      next: (data) => {
        this.offresIA = data.map(offre => ({
          ...offre,
          showManualForm: false,
          offreManuelle: offre.offreManuelle || ''
        }));
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  accepterOffre(offre: any) {
    offre.statut = 'ACCEPTE';
    this.showToastMessage('Offre acceptée');
  }

  rejeterOffre(offre: any) {
    offre.statut = 'REJETE';
    offre.showManualForm = true;
  }

  soumettreOffreManuelle(offre: any) {
    if (!offre.offreManuelle || offre.offreManuelle.trim() === '') {
      this.showToastMessage('Veuillez saisir votre offre', 'error');
      return;
    }
    offre.showManualForm = false;
    this.showToastMessage('Offre personnalisée soumise');
  }

  isselectedquestion(id: number): boolean {
    return this.questform.questions.some((x: number) => x === id);
  }

  changequestion(id: number) {
    if (this.isselectedquestion(id)) {
      this.questform.questions = this.questform.questions.filter((x: number) => x !== id);
      this.selectedquestion = this.selectedquestion.filter(q => q.id !== id);
    } else {
      this.questform.questions.push(id);
      const q = this.questions.find(q => q.id === id);
      if (q) this.selectedquestion.push(q);
    }
  }

  removeselectedquestion(id: number) {
    this.questform.questions = this.questform.questions.filter((x: number) => x !== id);
    this.selectedquestion = this.selectedquestion.filter(q => q.id !== id);
  }

  createaddquestion() {
    if (!this.newquest.titre) return;
    this.http.post<any>(this.apiUrl + '/questions', this.newquest).subscribe((c: any) => {
      this.selectedquestion.push(c);
      this.questions.push(c);
      this.questform.questions.push(c.id);
      this.newquest = { titre: '', type: 'text', options: '' };
      this.showaddquestion = false;
    });
  }

  dragStart(i: number, e: DragEvent) { e.dataTransfer?.setData('text/plain', i.toString()); }
  dragover(i: number, e: DragEvent) { e.preventDefault(); this.dragoverIndex = i; }
  drop(toindex: number, e: DragEvent) {
    e.preventDefault();
    const from = parseInt(e.dataTransfer?.getData('text/plain') || '0');
    const item = this.selectedquestion.splice(from, 1)[0];
    this.selectedquestion.splice(toindex, 0, item);
    this.dragoverIndex = -1;
    this.questform.questions = this.selectedquestion.map(q => q.id);
  }

  ouvrirPartage(q: any) {
    this.selectedQuestionnaire = q;
    this.clientsFiltres = [];
    this.showPartageModal = true;
  }

  rechercherClients() {
    this.api.getClientsFiltres(this.filtre).subscribe(data => this.clientsFiltres = data);
  }

  envoyerLien(clientId: number) {
    this.api.genererLien(this.selectedQuestionnaire.id, clientId).subscribe((token: string) => {
        const lien = `http://localhost:4200/repondre?token=${token}`;
        navigator.clipboard.writeText(lien);
        this.showToastMessage('Lien copié ! Envoyez-le au client.');
    });
  }

  envoyerATous() {
    for (let c of this.clientsFiltres) {
      this.api.genererLien(this.selectedQuestionnaire.id, c.id).subscribe(() => {});
    }
    this.showToastMessage('Envoi en cours...');
  }

  showToastMessage(message: string, type = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 3000);
  }
}