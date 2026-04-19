import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';
import { finalize, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

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
  isLoading = true;
  private allReponses: any[] = [];      // cached — loaded once per updateStats
  private reponsesLoading = false;      // guard against duplicate /reponses calls
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
  offres: any[] = [];

  totalQuestionnaires = 0;
  pendingCount = 0;
  publishedCount = 0;
  totalReponses = 0;

  showquestform = false;
  editingquest: any = null;
  questform: any = { titre: '', description: '', questions: [] };
  questions: any[] = [];
  showaddquestion = false;
  newquest: any = { titre: '', type: 'text', options: '', required: false };
  selectedquestion: any[] = [];
  questionSearchText = '';

  iaAutoSuggestion: any = null;
  iaDoublonWarning: any = null;
  iaCoherenceWarning: any = null;
  iaTypeWarning: any = null;
  iaEnsembleWarning: any = null;
  iaOptionsSuggestion: string[] = [];
  iaLoading = false;
  iaReordering = false;


  get filteredQuestions(): any[] {
    const term = this.questionSearchText.trim().toLowerCase();
    if (!term) return this.questions;
    return this.questions.filter(q => (q.titre || q.title || '').toLowerCase().includes(term));
  }
  dragoverIndex = -1;

  showPartageModal = false;
  clientsFiltres: any[] = [];
  filtre = { typeContrat: '', anneeMin: null, profession: '', primeRange: '' };
  clientChannels: { [id: number]: string } = {};
  clientsAyantRepondu: Set<number> = new Set();

  notifications: any[] = [];
  unreadNotifCount = 0;
  showNotifPanel = false;

  iaQuestDoublonWarning: any = null;
  iaQuestDoublonLoading = false;

  private platformId = inject(PLATFORM_ID);
  private iaDebounceTimer: any = null;
  private iaEnsembleTimer: any = null;
  private iaReorderTimer: any = null;
  private iaActiveCalls = 0;

  constructor(
    private http: HttpClient,
    private router: Router,
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

    // Questionnaires changed → refresh stats + all charts (updateStats triggers renderAllCharts)
    this.wsService.questionnaires$.subscribe(data => {
      const all = data.map((q: any) => this.mapStatut(q));
      // Directeur sees all; regular gestionnaire sees only their own
      this.questionnaires = this.canManageAll()
        ? all
        : all.filter((q: any) => q.gestionnaire?.id === this.gestionnaire.id);
      this.updateStats();
      this.cdr.detectChanges();
    });

    this.wsService.question$.subscribe(data => { this.questions = data; this.cdr.detectChanges(); });

    // Recommendations changed → reload data + refresh charts (all users)
    this.wsService.recommendations$.subscribe(() => {
      this.loadRecommendations();
      this.cdr.detectChanges();
    });

    this.wsService.adminNotifications$.subscribe(data => {
      if (this.canManageAll()) {
        const allowed = ['DEMANDE_PUBLICATION', 'TOUS_ONT_REPONDU'];
        const filtered = data.filter((n: any) => allowed.includes(n.type));
        this.notifications = filtered;
        this.unreadNotifCount = filtered.filter((n: any) => !n.vue).length;
      } else {
        // Regular gestionnaire: show delegation requests addressed to them
        const mine = data.filter((n: any) =>
          n.type === 'DEMANDE_CREATION_QUESTIONNAIRE' && n.sourceId === this.gestionnaire.id
        );
        this.notifications = mine;
        this.unreadNotifCount = mine.filter((n: any) => !n.vue).length;
      }
      this.cdr.detectChanges();
    });
    this.loadNotifications();

    this.loadQuestionnaires();
    this.loadOffresIA();
    this.loadRecommendations();
    if (this.canManageAll()) this.loadMyTeams();
    this.http.get<any[]>(this.apiUrl + '/questions').subscribe({
      next: (data) => { this.questions = data; },
      error: () => {}
    });
    this.api.getClientsFiltres({}).subscribe({
      next: (data) => { this.allClients = data; },
      error: () => {}
    });
  }

  canManageAll(): boolean {
    return this.permission?.toUpperCase() === 'DIRECTEUR';
  }

  setSection(section: string) {
    this.activeSection = section;
    this.showQuestionsView = false;
    if (section === 'reponses') {
      this.reponses = [];
      this.selectedQuestionnaireId = '';
      this.loadRecommendations();
    }
    if (section === 'home') {
      // Wait for Angular to re-insert the canvas elements (*ngIf recreates the DOM)
      setTimeout(() => this.renderAllCharts(), 200);
    }
  }

  private renderAllCharts() {
    this.renderSentimentChart();
    this.renderScoreChart();
    this.renderStatutChart();
    this.renderReponsesChart();
  }

  getSectionTitle() {
    if (this.activeSection === 'home') return 'Tableau de bord';
    if (this.activeSection === 'questionnaires') return 'Questionnaires';
    if (this.activeSection === 'reponses') return 'Réponses des clients';
    if (this.activeSection === 'offres') return 'Offres';
    if (this.activeSection === 'teams') return 'Mes Équipes';
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
    } else {
      q.statut = q.statut.toUpperCase().trim();
    }
    return q;
  }

  private sentimentChart: Chart | null = null;
  private reponsesParQuestionChart: Chart | null = null;

  private scoreChart: Chart | null = null;
  private statutChart: Chart | null = null;
  private reponsesChart: Chart | null = null;

  private countUp(target: number, setter: (v: number) => void, duration = 1100) {
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setter(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
      else { setter(target); this.cdr.detectChanges(); }
    };
    requestAnimationFrame(tick);
  }

  private updateStats() {
    const mine = this.canManageAll()
      ? this.questionnaires
      : this.questionnaires.filter((q: any) => q.gestionnaire?.id === this.gestionnaire.id);
    const total     = mine.length;
    const pending   = mine.filter((q: any) => (q.statut||'').toUpperCase() === 'EN_ATTENTE').length;
    const published = mine.filter((q: any) => ['PUBLIE','APPROUVE'].includes((q.statut||'').toUpperCase())).length;
    this.countUp(total,     v => { this.totalQuestionnaires = v; this.cdr.detectChanges(); });
    this.countUp(pending,   v => { this.pendingCount        = v; this.cdr.detectChanges(); });
    this.countUp(published, v => { this.publishedCount      = v; this.cdr.detectChanges(); });

    // Load /reponses ONCE — used by both totalReponses counter and reponsesChart
    if (this.reponsesLoading) return;
    this.reponsesLoading = true;
    this.http.get<any[]>(this.apiUrl + '/reponses').pipe(
      timeout(10000),
      catchError(() => of([])),
      finalize(() => { this.reponsesLoading = false; })
    ).subscribe({
      next: (data) => {
        this.allReponses = data || [];
        const ids = new Set(mine.map((q: any) => q.id));
        const relevant = this.allReponses.filter((r: any) => ids.has(r.questionnaire?.id));
        const unique = new Set(relevant.map((r: any) => `${r.client?.id}-${r.questionnaire?.id}`));
        this.countUp(unique.size, v => { this.totalReponses = v; this.cdr.detectChanges(); });
        if (this.activeSection === 'home') setTimeout(() => this.renderAllCharts(), 150);
      }
    });
  }

  renderSentimentChart() {
    const sentMap: any = { VERY_POSITIVE: 0, POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, VERY_NEGATIVE: 0 };
    for (const r of this.recommendations) {
      const s = r.clientKpi?.sentiment;
      if (s && sentMap[s] !== undefined) sentMap[s]++;
    }
    const canvas = document.getElementById('sentimentChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.sentimentChart) { this.sentimentChart.destroy(); this.sentimentChart = null; }
    this.sentimentChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Très positif', 'Positif', 'Neutre', 'Négatif', 'Très négatif'],
        datasets: [{
          data: [sentMap.VERY_POSITIVE, sentMap.POSITIVE, sentMap.NEUTRAL, sentMap.NEGATIVE, sentMap.VERY_NEGATIVE],
          backgroundColor: ['#1abc9c', '#2ecc71', '#f39c12', '#e67e22', '#e74c3c'],
          borderWidth: 2
        }]
      },
      options: { plugins: { legend: { position: 'bottom' } }, cutout: '60%' }
    });
  }

  renderScoreChart() {
    const labels = this.recommendations.filter((r: any) => r.clientKpi?.score != null).map((r: any) => r.clientKpi?.client?.fullName || 'Client');
    const scores = this.recommendations.filter((r: any) => r.clientKpi?.score != null).map((r: any) => r.clientKpi.score);
     const canvas = document.getElementById('scoreChart') as HTMLCanvasElement;
     if (!canvas) return;

      if (this.scoreChart) {
    this.scoreChart.destroy();
    this.scoreChart = null;
  }
   this.scoreChart = new Chart(canvas, {
    type: 'bar', 
    data: {
      labels ,   
      datasets: [{
        label: 'Score',
        data: scores, 
         backgroundColor: scores.map(s =>
          s >= 70 ? '#27ae60' : s >= 40 ? '#f39c12' : '#e74c3c'
        ),
        borderRadius: 6,        
        borderSkipped: false     
      }]
    },
    options: {
      plugins: {
           legend: { display: false }  
      },
      scales: {
        y: {
          min: 0,           
          max: 100,         
          ticks: { stepSize: 20 } 
        },
         x: {
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
  }

  renderStatutChart() {

  // Scope to questionnaires visible to this user
  const visible = this.canManageAll()
    ? this.questionnaires
    : this.questionnaires.filter(q => q.gestionnaire?.id === this.gestionnaire?.id);

  const brouillon = visible.filter(q => (q.statut||'').toUpperCase() === 'BROUILLON').length;
  const enAttente = visible.filter(q => (q.statut||'').toUpperCase() === 'EN_ATTENTE').length;
  const approuve  = visible.filter(q => ['PUBLIE','APPROUVE'].includes((q.statut||'').toUpperCase())).length;
  const rejete    = visible.filter(q => (q.statut||'').toUpperCase() === 'REJETE').length;

  
  const canvas = document.getElementById('statutChart') as HTMLCanvasElement;
  if (!canvas) return;

  
  if (this.statutChart) {
    this.statutChart.destroy();
    this.statutChart = null;
  }


  this.statutChart = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: ['Brouillon', 'En attente', 'Approuvé', 'Rejeté'],
      datasets: [{
        data: [brouillon, enAttente, approuve, rejete],
        backgroundColor: [
          '#95a5a6',  
          '#f39c12',  
          '#27ae60',  
          '#e74c3c'   
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}
renderReponsesChart() {

  // Only show questionnaires visible to the current user
  const visibleIds = new Set(
    (this.canManageAll()
      ? this.questionnaires
      : this.questionnaires.filter((q: any) => q.gestionnaire?.id === this.gestionnaire?.id)
    ).map((q: any) => q.id)
  );

  // Use already-loaded cached responses (no extra HTTP call)
  const buildChart = (data: any[]) => {
      const map = new Map<string, Set<number>>();

      for (const r of data) {
        const qId = r.questionnaire?.id;
        const qTitre = r.questionnaire?.titre || 'Questionnaire ' + qId;
        const clientId = r.client?.id;
        if (!qId || !clientId) continue;
        if (!visibleIds.has(qId)) continue;

        const key = qTitre;
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(clientId);
      }

      
      const labels = Array.from(map.keys());
      const counts = Array.from(map.values()).map(set => set.size);

      
      const canvas = document.getElementById('reponsesChart') as HTMLCanvasElement;
      if (!canvas) return;

      
      if (this.reponsesChart) {
        this.reponsesChart.destroy();
        this.reponsesChart = null;
      }

    
      this.reponsesChart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Clients ayant répondu',
            data: counts,
            backgroundColor: '#3498db',
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          indexAxis: 'y',  
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { stepSize: 1 }  
            },
            y: {
              ticks: { font: { size: 11 } }
            }
          }
        }
      });
  };

  buildChart(this.allReponses);
}

  loadQuestionnaires() {
    const url = this.canManageAll()
      ? this.apiUrl + '/questionnaires'
      : this.apiUrl + '/questionnaires/gestionnaire/' + this.gestionnaire.id;

    this.http.get<any[]>(url).pipe(
      timeout(12000),
      catchError(() => of([])),
      finalize(() => { this.isLoading = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: (data) => {
        this.questionnaires = (data || []).map((q: any) => this.mapStatut(q));
        this.updateStats();
        this.cdr.detectChanges();
      }
    });
  }

  loadNotifications() {
    this.api.getNotifications().subscribe({
      next: (data: any[]) => {
        if (this.canManageAll()) {
          const allowed = ['DEMANDE_PUBLICATION', 'TOUS_ONT_REPONDU'];
          const filtered = data.filter((n: any) => allowed.includes(n.type));
          this.notifications = filtered;
          this.unreadNotifCount = filtered.filter((n: any) => !n.vue).length;
        } else {
          const mine = data.filter((n: any) =>
            n.type === 'DEMANDE_CREATION_QUESTIONNAIRE' && n.sourceId === this.gestionnaire.id
          );
          this.notifications = mine;
          this.unreadNotifCount = mine.filter((n: any) => !n.vue).length;
        }
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
        this.showToastMessage('Questionnaire approuvé');
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
    this.questionSearchText = '';
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
    this.questionSearchText = '';
    this.showquestform = true;
  }

  savequestionnaire() {
    this.questform.questions = this.selectedquestion;
    if (this.editingquest) {
      const isDirecteur = this.canManageAll();
      const wasNotBrouillon = this.editingquest.statut !== 'BROUILLON';
      const payload: any = {
        titre: this.questform.titre,
        description: this.questform.description,
        questions: this.selectedquestion
      };
      if (wasNotBrouillon && !isDirecteur) payload.statut = 'BROUILLON';
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
    Swal.fire({
      title: 'Supprimer ce questionnaire ?', text: 'Cette action est irréversible.', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
      confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.delete(this.apiUrl + '/questionnaires/' + id).subscribe({
          next: () => { this.loadQuestionnaires(); Swal.fire({ icon: 'success', title: 'Supprimé !', timer: 1200, showConfirmButton: false }); },
          error: () => Swal.fire({ icon: 'error', title: 'Erreur lors de la suppression' })
        });
      }
    });
  }

  demanderPublication(q: any) {
    Swal.fire({
      title: 'Demander la publication ?', text: `"${q.titre}" sera soumis pour approbation.`, icon: 'question',
      showCancelButton: true, confirmButtonColor: '#28a745', cancelButtonColor: '#6c757d',
      confirmButtonText: 'Envoyer', cancelButtonText: 'Annuler'
    }).then(result => {
      if (result.isConfirmed) {
        this.api.demanderPublication(q.id, this.gestionnaire.id).subscribe({
          next: () => { this.loadQuestionnaires(); Swal.fire({ icon: 'success', title: 'Demande envoyée !', timer: 1500, showConfirmButton: false }); },
          error: () => Swal.fire({ icon: 'error', title: 'Erreur lors de l\'envoi' })
        });
      }
    });
  }

  retirerDemande(q: any) {
    Swal.fire({
      title: 'Retirer la demande ?', text: 'Le questionnaire reviendra en brouillon.', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
      confirmButtonText: 'Retirer', cancelButtonText: 'Annuler'
    }).then(result => {
      if (result.isConfirmed) {
        this.api.retirerDemande(q.id).subscribe({
          next: () => { this.loadQuestionnaires(); Swal.fire({ icon: 'success', title: 'Demande retirée', timer: 1500, showConfirmButton: false }); },
          error: () => Swal.fire({ icon: 'error', title: 'Erreur' })
        });
      }
    });
  }

  viewQuestions(q: any) {
    this.selectedQuestionnaire = q;
    this.showQuestionsView = true;
  }

  deleteQuestion(questionId: number, questionnaire: any) {
    Swal.fire({
      title: 'Supprimer cette question ?', text: 'Cette action est irréversible.', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
      confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.delete(this.apiUrl + '/questions/' + questionId).subscribe({
          next: () => {
            questionnaire.questions = questionnaire.questions.filter((q: any) => q.id !== questionId);
            this.selectedQuestionnaire = { ...questionnaire };
            this.questionnaires = this.questionnaires.map((item: any) =>
              item.id === questionnaire.id ? { ...questionnaire } : item
            );
            this.cdr.detectChanges();
            Swal.fire({ icon: 'success', title: 'Question supprimée', timer: 1200, showConfirmButton: false });
          },
          error: () => Swal.fire({ icon: 'error', title: 'Erreur lors de la suppression' })
        });
      }
    });
  }

  getBadgeClass(statut: string) {
    const s = (statut || '').toUpperCase().trim();
    if (s === 'BROUILLON') return 'badge-brouillon';
    if (s === 'EN_ATTENTE') return 'badge-pending';
    if (s === 'PUBLIE' || s === 'APPROUVE') return 'badge-published';
    if (s === 'REJETE') return 'badge-danger';
    return 'badge-brouillon';
  }

  getStatutLabel(statut: string) {
    const s = (statut || '').toUpperCase().trim();
    if (s === 'BROUILLON') return 'Brouillon';
    if (s === 'EN_ATTENTE') return 'En attente';
    if (s === 'PUBLIE' || s === 'APPROUVE') return 'Approuvé';
    if (s === 'REJETE') return 'Rejeté';
    return 'Brouillon';
  }

  isMyQuestionnaire(q: any): boolean {
    return q.gestionnaire?.id === this.gestionnaire?.id;
  }

  canEdit(q: any): boolean {
    return this.canManageAll() || this.isMyQuestionnaire(q);
  }

  private statut(q: any): string {
    return (q.statut || '').toUpperCase().trim();
  }

  canDelete(q: any): boolean {
    return this.canManageAll() || this.isMyQuestionnaire(q);
  }

  canRequestPublication(q: any): boolean {
    const s = this.statut(q);
    return !this.canManageAll() && this.isMyQuestionnaire(q) &&
      (s === 'BROUILLON' || s === 'REJETE');
  }

  canWithdraw(q: any): boolean {
    return !this.canManageAll() && this.isMyQuestionnaire(q) && this.statut(q) === 'EN_ATTENTE';
  }

  canApprove(q: any): boolean {
    return this.canManageAll() && this.statut(q) === 'EN_ATTENTE';
  }

  canReject(q: any): boolean {
    const s = this.statut(q);
    const isDirecteurQuestionnaire = q?.gestionnaire?.role?.name?.toUpperCase() === 'DIRECTEUR';
    return this.canManageAll() && !isDirecteurQuestionnaire &&
      (s === 'EN_ATTENTE' || s === 'PUBLIE' || s === 'APPROUVE');
  }

  canShare(q: any): boolean {
    const s = this.statut(q);
    return s === 'PUBLIE' || s === 'APPROUVE';
  }

  showClientReponsesModal = false;
  selectedClientData: any = null;
  selectedClientReponses: any[] = [];

  renderReponsesParQuestion(sent: number, repondu: number) {
    const canvas = document.getElementById('reponsesParQuestionChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.reponsesParQuestionChart) { this.reponsesParQuestionChart.destroy(); this.reponsesParQuestionChart = null; }

    this.reponsesParQuestionChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Envoyés', 'Ont répondu'],
        datasets: [{
          data: [sent, repondu],
          backgroundColor: ['#1a56db', '#27ae60'],
          borderRadius: 8,
          barThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y ?? 0;
                const pct = sent > 0 ? Math.round((val / sent) * 100) : 0;
                return ` ${val} clients (${pct}%)`;
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  loadReponses() {
    if (!this.selectedQuestionnaireId) { this.reponses = []; return; }
    const titre = this.questionnaires.find((q: any) => q.id == this.selectedQuestionnaireId)?.titre || 'Questionnaire';
    this.http.get<any[]>(this.apiUrl + '/reponses/questionnaire/' + this.selectedQuestionnaireId).subscribe({
      next: (data) => {
        this.reponses = data;
        const clients = new Set(data.map((r: any) => r.client?.id)).size;
        this.totalReponses = clients;
        this.cdr.detectChanges();
        const nb = data.length;
        if (nb === 0) {
          Swal.fire({
            title: `${titre}`,
            html: `<p>Aucune réponse reçue pour ce questionnaire.</p>`,
            icon: 'info',
            confirmButtonText: 'OK',
            confirmButtonColor: '#27ae60',
            timer: 2500,
            showConfirmButton: true
          });
        } else {
          this.http.get<any>(this.apiUrl + '/envoi/stats?questionnaireId=' + this.selectedQuestionnaireId).subscribe({
            next: (stats) => setTimeout(() => this.renderReponsesParQuestion(stats['sent'], stats['repondu']), 150),
            error: ()    => setTimeout(() => this.renderReponsesParQuestion(clients, clients), 150)
          });
        }
      },
      error: () => this.showToastMessage('Erreur lors du chargement des réponses', 'error')
    });
  }

  get clientsReponses(): any[] {
    const map = new Map<number, any>();
    for (const r of this.reponses) {
      const id = r.client?.id;
      if (!map.has(id)) {
        map.set(id, {
          client: r.client,
          reponses: [],
          nbReponses: 0
        });
      }
      const entry = map.get(id);
      entry.reponses.push(r);
      entry.nbReponses++;
    }
    return Array.from(map.values());
  }

  voirReponsesClient(entry: any) {
    this.selectedClientData = entry.client;
    this.selectedClientReponses = entry.reponses;
    this.showClientReponsesModal = true;
    this.cdr.detectChanges();
  }

  exportReponsesCSV() {
    if (this.reponses.length === 0) { this.showToastMessage('Aucune réponse à exporter', 'error'); return; }
    const titre = this.questionnaires.find((q: any) => q.id == this.selectedQuestionnaireId)?.titre || 'questionnaire';
    const nomFichier = titre.replace(/ /g, '_');
    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;

    
    let lignes = 'Client;Email;Téléphone;Question;Type;Réponse\r\n';
    for (const entry of this.clientsReponses) {
      for (const r of entry.reponses) {
        const esc = (v: string) => '"' + (v || '').replace(/"/g, '""') + '"';
        lignes += [
          esc(entry.client?.fullName || ''),
          esc(entry.client?.mail || ''),
          esc(entry.client?.tel || ''),
          esc(r.question?.titre || ''),
          esc(r.question?.type || ''),
          esc(r.reponse || '')
        ].join(';') + '\r\n';
      }
      lignes += '\r\n'; 
    }

    const blob = new Blob(['\uFEFF' + lignes], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reponses_${nomFichier}_${dateStr}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    this.showToastMessage('Export CSV téléchargé');
  }

  private buildOffreSelectHtml(preselectedId?: number, clientKpiScore?: number | null): string {
    if (!this.offres.length) return '<p style="color:#e74c3c">Aucune offre disponible.</p>';
    const eligible = clientKpiScore != null
      ? this.offres.filter((o: any) => clientKpiScore >= (o.scoreMin ?? 0) && clientKpiScore <= (o.scoreMax ?? 100))
      : this.offres;
    const blocked = clientKpiScore != null
      ? this.offres.filter((o: any) => clientKpiScore < (o.scoreMin ?? 0) || clientKpiScore > (o.scoreMax ?? 100))
      : [];
    if (!eligible.length) {
      return `<div style="background:#fdf0f0;border:1px solid #e74c3c;border-radius:8px;padding:12px;color:#a93226;font-size:13px;margin-top:8px;">
        <b>🚫 Aucune offre disponible</b><br>Le score KPI de ce client (${clientKpiScore}/100) ne correspond à aucune offre active.
      </div>`;
    }
    let opts = eligible.map(o =>
      `<option value="${o.id}" ${preselectedId === o.id ? 'selected' : ''}>${o.title} (KPI ${o.scoreMin}–${o.scoreMax})</option>`
    ).join('');
    const blockedNote = blocked.length
      ? `<p style="font-size:11px;color:#e67e22;margin-top:6px;">🔒 ${blocked.length} offre(s) non disponible(s) — score KPI insuffisant ou trop élevé.</p>`
      : '';
    return `<select id="swal-offre-select" class="swal2-input" style="margin-top:8px">
              <option value="">-- Choisir une offre --</option>${opts}
            </select>${blockedNote}`;
  }

  envoyerOffreClient(client: any) {
    if (!this.offres.length) {
      Swal.fire({ icon: 'warning', title: 'Aucune offre', text: 'Créez d\'abord des offres.', confirmButtonColor: '#27ae60' });
      return;
    }

    const rec = this.recommendations.find((r: any) => r.clientKpi?.client?.id === client.id);
    const aiOffre = rec ? (rec.finalOffre || rec.aiRecommendedOffre) : null;
    const score = rec?.clientKpi?.score ?? null;
    const sentimentEmoji = rec ? this.getSentimentEmoji(rec.clientKpi?.sentiment) : '';

    const recHtml = rec ? `
      <div style="background:#f0faf4;border:1px solid #a9dfbf;border-radius:10px;padding:10px 14px;margin-bottom:12px;text-align:left;">
        <div style="font-weight:700;color:#1a3d2b;margin-bottom:4px;">Suggestion IA</div>
        <div style="font-size:12px;color:#555;">Score : <b style="color:#27ae60">${score}/100</b> &nbsp;${sentimentEmoji} <b>${rec.clientKpi?.sentiment || ''}</b></div>
        <div style="font-size:12px;color:#555;">Offre recommandée : <b style="color:#2980b9">${aiOffre?.title || '—'}</b></div>
        ${aiOffre ? `<button type="button" id="swal-use-ai-btn"
          onclick="document.getElementById('swal-offre-select').value='${aiOffre.id}';this.style.background='#27ae60';this.textContent='✓ Sélectionnée'"
          style="margin-top:8px;background:#2ecc71;color:white;border:none;border-radius:6px;padding:5px 12px;font-size:11px;cursor:pointer;">
          Utiliser cette offre</button>` : ''}
      </div>` : '';

    // Step 1: pick offer
    Swal.fire({
      title: `Envoyer une offre à ${client.fullName || 'ce client'}`,
      html: recHtml + this.buildOffreSelectHtml(aiOffre?.id, score),
      showCancelButton: true,
      confirmButtonText: 'Suivant →',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#4a6fa5',
      cancelButtonColor: '#95a5a6',
      reverseButtons: true,
      preConfirm: () => {
        const sel = document.getElementById('swal-offre-select') as HTMLSelectElement;
        if (!sel?.value) { Swal.showValidationMessage('Veuillez sélectionner une offre.'); return false; }
        return sel.value;
      }
    }).then(result => {
      if (!result.isConfirmed || !result.value) return;
      const offreId = Number(result.value);
      const offre = this.offres.find((o: any) => o.id === offreId);
      this.envoyerOffreStep2(client, offre, rec, aiOffre);
    });
  }

  private envoyerOffreStep2(client: any, offre: any, rec: any, aiOffre: any) {
    // Step 2: choose channel + AI generates text
    Swal.fire({
      title: 'Choisir le canal d\'envoi',
      html: `
        <p style="color:#555;font-size:13px;margin-bottom:16px;">Comment envoyer <b>${offre?.title}</b> à <b>${client.fullName}</b> ?</p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button id="swal-btn-email" style="flex:1;padding:14px;background:linear-gradient(135deg,#1a56db,#1e3a8a);color:white;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">
            ✉️ Email
          </button>
          <button id="swal-btn-sms" style="flex:1;padding:14px;background:linear-gradient(135deg,#27ae60,#1a6e3c);color:white;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">
            📱 SMS
          </button>
        </div>`,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: '← Retour',
      cancelButtonColor: '#95a5a6',
      didOpen: () => {
        document.getElementById('swal-btn-email')?.addEventListener('click', () => {
          Swal.close();
          this.envoyerOffreAvecIA(client, offre, rec, aiOffre, 'email');
        });
        document.getElementById('swal-btn-sms')?.addEventListener('click', () => {
          Swal.close();
          this.envoyerOffreAvecIA(client, offre, rec, aiOffre, 'sms');
        });
      }
    });
  }

  private envoyerOffreAvecIA(client: any, offre: any, rec: any, aiOffre: any, channel: string) {
    // Step 3: AI generates text → preview → send
    Swal.fire({
      title: 'Génération IA en cours…',
      html: '<p style="color:#555;font-size:13px;">L\'IA rédige le message personnalisé…</p>',
      allowOutsideClick: false, allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    this.http.post<any>(this.apiUrl + '/ia/generer-message', {
      type: 'offre', channel,
      titre: offre?.title,
      description: offre?.description
    }).subscribe({
      next: (msg) => {
        const sujet = msg.sujet || '';
        const corps = (msg.corps || '').replace('{NOM_CLIENT}', client.fullName || 'client');
        const isEmail = channel === 'email';
        const channelLabel = isEmail ? '✉️ Email' : '📱 SMS';
        const channelColor = isEmail ? '#1a56db' : '#27ae60';

        Swal.fire({
          title: `${channelLabel} — Aperçu IA`,
          html: `
            ${isEmail && sujet ? `<div style="background:#f5f6ff;border-radius:8px;padding:8px 12px;margin-bottom:10px;text-align:left;font-size:12px;">
              <b style="color:#4a5568">Objet :</b> <span style="color:#1a3d2b">${sujet}</span>
            </div>` : ''}
            <div style="background:#f9fafb;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:left;font-size:12px;line-height:1.7;white-space:pre-wrap;max-height:200px;overflow-y:auto;">${corps}</div>
            <p style="font-size:11px;color:#999;margin-top:8px;">Vous pouvez envoyer ce message ou revenir en arrière.</p>`,
          showCancelButton: true,
          confirmButtonText: `Envoyer par ${isEmail ? 'email' : 'SMS'}`,
          cancelButtonText: '← Retour',
          confirmButtonColor: channelColor,
          cancelButtonColor: '#95a5a6',
          reverseButtons: true
        }).then(r2 => {
          if (!r2.isConfirmed) { this.envoyerOffreStep2(client, offre, rec, aiOffre); return; }
          this.doEnvoyerOffre(client, offre, rec, aiOffre, channel, sujet, corps);
        });
      },
      error: () => {
        // AI failed — send with default text
        const corps = `Bonjour ${client.fullName},\n\n${offre?.title}\n${offre?.description}\n\nCordialement,\nSTAR Assurances`;
        this.doEnvoyerOffre(client, offre, rec, aiOffre, channel, offre?.title, corps);
      }
    });
  }

  private doEnvoyerOffre(client: any, offre: any, rec: any, aiOffre: any, channel: string, sujet: string, corps: string) {
    Swal.fire({ title: 'Envoi en cours…', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });

    const send = () => this.http.post<any>(this.apiUrl + '/offres/envoyer', {
      offreId: offre.id, clientIds: [client.id], channel, sujet, corps
    }).subscribe({
      next: () => Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Offre envoyée !', showConfirmButton: false, timer: 2500, timerProgressBar: true }),
      error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible d\'envoyer l\'offre.', confirmButtonColor: '#27ae60' })
    });

    if (rec) {
      const url = aiOffre && offre.id === aiOffre.id
        ? this.apiUrl + '/recommendations/' + rec.id + '/accept'
        : this.apiUrl + '/recommendations/' + rec.id + '/override/' + offre.id;
      const method = aiOffre && offre.id === aiOffre.id ? 'put' : 'put';
      this.http[method](url, {}).subscribe({ next: () => send(), error: () => send() });
    } else {
      send();
    }
  }

  voirRecommandationsIA() {
    const count = this.clientsReponses.length;
    const titre = this.questionnaires.find((q: any) => q.id == this.selectedQuestionnaireId)?.titre || 'ce questionnaire';

    const offreCountMap = new Map<number, { offre: any; clients: number; kpiAvg: number; kpiSum: number }>();
    let noRecCount = 0;
    for (const e of this.clientsReponses) {
      const rec = this.recommendations.find((r: any) => r.clientKpi?.client?.id === e.client?.id);
      const aiOffre = rec ? (rec.finalOffre || rec.aiRecommendedOffre) : null;
      const kpi = rec?.clientKpi?.score ?? 0;
      if (aiOffre) {
        const entry = offreCountMap.get(aiOffre.id);
        if (entry) { entry.clients++; entry.kpiSum += kpi; entry.kpiAvg = entry.kpiSum / entry.clients; }
        else offreCountMap.set(aiOffre.id, { offre: aiOffre, clients: 1, kpiSum: kpi, kpiAvg: kpi });
      } else {
        noRecCount++;
      }
    }

    const offreCounts = Array.from(offreCountMap.values()).sort((a, b) => b.clients - a.clients);
    const pieColors = ['#27ae60','#1a56db','#e67e22','#8e44ad','#e74c3c','#16a085','#f39c12','#2980b9'];

    const rowsHtml = offreCounts.map(({ offre, clients, kpiAvg }, i) => `
      <tr>
        <td style="padding:6px 8px;font-weight:600;color:${pieColors[i % pieColors.length]}">${offre.title}</td>
        <td style="padding:6px 8px;text-align:center"><b>${clients}</b></td>
        <td style="padding:6px 8px;text-align:center">${offre.scoreMin}–${offre.scoreMax}</td>
        <td style="padding:6px 8px;text-align:center"><b>${Math.round(kpiAvg)}</b>/100</td>
      </tr>`).join('');

    const noRecRow = noRecCount > 0
      ? `<tr><td style="padding:6px 8px;color:#999;font-style:italic">Sans recommandation</td><td style="padding:6px 8px;text-align:center">${noRecCount}</td><td colspan="2" style="padding:6px 8px;text-align:center;color:#bbb">—</td></tr>`
      : '';

    const tableHtml = offreCounts.length > 0 ? `
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;text-align:left;">
        <thead><tr style="background:#f5f6ff;color:#4a5568;font-size:11px;">
          <th style="padding:6px 8px">Offre IA</th>
          <th style="padding:6px 8px;text-align:center">Clients</th>
          <th style="padding:6px 8px;text-align:center">KPI cible</th>
          <th style="padding:6px 8px;text-align:center">KPI moyen</th>
        </tr></thead>
        <tbody>${rowsHtml}${noRecRow}</tbody>
      </table>` : '';

    const emptyHtml = offreCounts.length === 0
      ? `<p style="color:#999;font-size:13px;margin-top:12px;">Aucune recommandation IA disponible pour ce questionnaire.</p>` : '';

    Swal.fire({
      title: '📊 Recommandations IA',
      html: `
        <p style="margin-bottom:10px;color:#555;font-size:13px;">Questionnaire : <b>${titre}</b> — <b>${count}</b> client(s)</p>
        <canvas id="swal-pie-chart" width="280" height="280" style="display:block;margin:0 auto;max-width:280px;max-height:280px;"></canvas>
        ${tableHtml}${emptyHtml}`,
      confirmButtonText: 'Fermer',
      confirmButtonColor: '#4a6fa5',
      width: 540,
      didOpen: () => {
        const canvas = document.getElementById('swal-pie-chart') as HTMLCanvasElement;
        if (!canvas || offreCounts.length === 0) return;
        new Chart(canvas, {
          type: 'pie',
          data: {
            labels: [
              ...offreCounts.map(({ offre, clients }) => `${offre.title} (${clients})`),
              ...(noRecCount > 0 ? [`Sans recommandation (${noRecCount})`] : [])
            ],
            datasets: [{
              data: [...offreCounts.map(e => e.clients), ...(noRecCount > 0 ? [noRecCount] : [])],
              backgroundColor: [...offreCounts.map((_, i) => pieColors[i % pieColors.length]), '#bdc3c7'],
              borderWidth: 2,
              borderColor: '#fff'
            }]
          },
          options: {
            plugins: {
              legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } },
              tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${Math.round((ctx.parsed / count) * 100)}%` } }
            }
          }
        });
      }
    });
  }

  loadOffresIA() {
    this.http.get<any[]>(this.apiUrl + '/offres').subscribe({
      next: (data) => {
        this.offres = data;
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

  // ── Recommendations ──────────────────────────────
  recommendations: any[] = [];
  offresAll: any[] = [];
  showOverrideModal = false;
  overrideRecId: number | null = null;
  overrideOffreId: number | null = null;

  loadRecommendations() {
    this.http.get<any[]>(this.apiUrl + '/recommendations').subscribe({
      next: (data) => {
        // Regular gestionnaire only sees recommendations linked to their own clients
        // DIRECTEUR sees all
        if (this.canManageAll()) {
          this.recommendations = data;
        } else {
          const myQuestionnaireIds = new Set(
            this.questionnaires
              .filter(q => q.gestionnaire?.id === this.gestionnaire?.id)
              .map((q: any) => q.id)
          );
          // Keep only recs where the client responded to one of my questionnaires
          // Fall back to all if no questionnaire scoping is available
          this.recommendations = myQuestionnaireIds.size > 0
            ? data.filter((r: any) =>
                r.clientKpi?.client?.id != null &&
                // If the rec has a gestionnaire link use it, otherwise keep all
                (r.gestionnaire?.id === this.gestionnaire?.id || !r.gestionnaire)
              )
            : data;
        }
        this.cdr.detectChanges();
        if (this.activeSection === 'home') setTimeout(() => this.renderAllCharts(), 100);
      },
      error: () => {}
    });
  }


  getSentimentEmoji(s: string): string {
    const map: any = { VERY_POSITIVE: 'Très positif', POSITIVE: 'Positif', NEUTRAL: 'Neutre', NEGATIVE: 'Négatif', VERY_NEGATIVE: 'Très négatif' };
    return map[s] || '';
  }

  getStatusLabel(s: string): string {
    const map: any = { PENDING: 'En attente', ACCEPTED: 'Acceptée', OVERRIDDEN: 'Modifiée', SENT: 'Envoyée' };
    return map[s] || s;
  }

  getStatusClass(s: string): string {
    const map: any = { PENDING: 'badge-warning', ACCEPTED: 'badge-success', OVERRIDDEN: 'badge-info', SENT: 'badge-sent' };
    return map[s] || '';
  }

  acceptRec(rec: any) {
    this.http.put(this.apiUrl + '/recommendations/' + rec.id + '/accept', {}).subscribe({
      next: () => { this.loadRecommendations(); this.showToastMessage('Recommandation acceptée'); },
      error: () => this.showToastMessage('Erreur', 'error')
    });
  }

  openOverride(rec: any) {
    this.overrideRecId = rec.id;
    this.overrideOffreId = null;
    this.offresAll = this.offres;
    this.showOverrideModal = true;
  }

  confirmOverride() {
    if (!this.overrideRecId || !this.overrideOffreId) return;
    this.http.put(this.apiUrl + '/recommendations/' + this.overrideRecId + '/override/' + this.overrideOffreId, {}).subscribe({
      next: () => { this.showOverrideModal = false; this.loadRecommendations(); this.showToastMessage('Offre modifiée'); },
      error: () => this.showToastMessage('Erreur', 'error')
    });
  }

  sendRec(rec: any) {
    Swal.fire({
      title: 'Envoyer l\'offre par email ?',
      html: `Envoyer <b>${rec.finalOffre?.title || rec.aiRecommendedOffre?.title || 'l\'offre'}</b> à <b>${rec.clientKpi?.client?.fullName}</b> ?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#27ae60', cancelButtonColor: '#95a5a6',
      confirmButtonText: 'Envoyer', cancelButtonText: 'Annuler'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.http.post(this.apiUrl + '/recommendations/' + rec.id + '/send', {}).subscribe({
        next: () => { this.loadRecommendations(); Swal.fire({ icon: 'success', title: 'Email envoyé !', timer: 2000, showConfirmButton: false }); },
        error: (err) => Swal.fire({ icon: 'error', title: 'Erreur', text: err?.error?.message || 'Envoi échoué' })
      });
    });
  }

  // ── Directeur offer catalog management ──────────
  showOffreForm = false;
  offreForm: any = { title: '', description: '', categorie: 'GENERAL' };
  editingOffre: any = null;
  offreIaResult: any = null;
  offreIaLoading = false;
  offreIaChecking = false;
  offreIaWarning: string | null = null;
  offreIaSuggestion: any = null;
  private offreCoherenceTimer: any = null;

  openAddOffre() {
    this.editingOffre = null;
    this.offreForm = { title: '', description: '', categorie: 'GENERAL' };
    this.offreIaResult = null;
    this.offreIaWarning = null;
    this.offreIaSuggestion = null;
    this.offreIaChecking = false;
    clearTimeout(this.offreCoherenceTimer);
    this.showOffreForm = true;
  }

  openEditOffre(offre: any) {
    this.editingOffre = offre;
    this.offreIaResult = null;
    this.offreIaWarning = null;
    this.offreIaSuggestion = null;
    this.offreIaChecking = false;
    clearTimeout(this.offreCoherenceTimer);
    this.offreForm = {
      title: offre.title, description: offre.description,
      categorie: offre.categorie || 'GENERAL',
      scoreMin: offre.scoreMin ?? 0, scoreMax: offre.scoreMax ?? 100,
      active: offre.active !== false
    };
    this.showOffreForm = true;
  }

  scheduleOffreCoherenceCheck() {
    if (this.editingOffre) return;
    this.offreIaResult = null;
    this.offreIaWarning = null;
    this.offreIaSuggestion = null;
    clearTimeout(this.offreCoherenceTimer);
    if (!this.offreForm.title?.trim() || !this.offreForm.description?.trim()) return;
    this.offreIaChecking = true;
    this.cdr.detectChanges();
    this.offreCoherenceTimer = setTimeout(() => this.runOffreCoherenceCheck(), 1200);
  }

  private runOffreCoherenceCheck() {
    this.http.post<any>(this.apiUrl + '/ia/evaluer-offre', {
      titre: this.offreForm.title,
      description: this.offreForm.description,
      categorie: this.offreForm.categorie
    }).subscribe({
      next: (res) => {
        this.offreIaChecking = false;
        this.applyOffreIaResponse(res);
      },
      error: () => { this.offreIaChecking = false; this.cdr.detectChanges(); }
    });
  }

  saveOffre() {
    if (!this.offreForm.title?.trim() || !this.offreForm.description?.trim()) {
      this.showToastMessage('Titre et description sont obligatoires', 'error'); return;
    }
    if (this.editingOffre) {
      const payload = { ...this.offreForm, active: true };
      this.api.updateoffre(this.editingOffre.id, payload).subscribe({
        next: () => { this.showOffreForm = false; this.loadOffresIA(); this.showToastMessage('Offre modifiée'); },
        error: () => this.showToastMessage('Erreur lors de la modification', 'error')
      });
      return;
    }
    if (this.offreIaResult) {
      const payload = {
        ...this.offreForm,
        scoreMin: this.offreIaResult.scoreMin ?? 0,
        scoreMax: this.offreIaResult.scoreMax ?? 100,
        active: true
      };
      this.api.addoffre(payload).subscribe({
        next: () => { this.showOffreForm = false; this.loadOffresIA(); this.showToastMessage('Offre ajoutée avec ciblage IA'); },
        error: () => this.showToastMessage('Erreur lors de l\'ajout', 'error')
      });
      return;
    }
    this.offreIaLoading = true;
    this.cdr.detectChanges();
    this.http.post<any>(this.apiUrl + '/ia/evaluer-offre', {
      titre: this.offreForm.title,
      description: this.offreForm.description,
      categorie: this.offreForm.categorie
    }).subscribe({
      next: (res) => {
        this.offreIaLoading = false;
        this.applyOffreIaResponse(res);
        if (this.offreIaWarning) return;
        const payload = {
          ...this.offreForm,
          scoreMin: res.scoreMin ?? 0,
          scoreMax: res.scoreMax ?? 100,
          active: true
        };
        this.api.addoffre(payload).subscribe({
          next: () => { this.showOffreForm = false; this.loadOffresIA(); this.showToastMessage('Offre ajoutée avec ciblage IA'); },
          error: () => this.showToastMessage('Erreur lors de l\'ajout', 'error')
        });
      },
      error: () => {
        this.offreIaLoading = false;
        this.cdr.detectChanges();
        const payload = { ...this.offreForm, scoreMin: 0, scoreMax: 100, active: true };
        this.api.addoffre(payload).subscribe({
          next: () => { this.showOffreForm = false; this.loadOffresIA(); this.showToastMessage('Offre ajoutée (ciblage par défaut)'); },
          error: () => this.showToastMessage('Erreur lors de l\'ajout', 'error')
        });
      }
    });
  }

  private applyOffreIaResponse(res: any) {
    if (res.coherent === false) {
      const suggestedCat = (res.categorieSuggeree || '').toUpperCase();
      const currentCat = (this.offreForm.categorie || '').toUpperCase();
      const realCatSuggestion = suggestedCat && suggestedCat !== currentCat ? res.categorieSuggeree : null;
      const hasSuggestion = res.titreSuggere || res.descriptionSugeree || realCatSuggestion;
      this.offreIaWarning = res.coherenceMessage || 'Le titre, la description et la catégorie ne correspondent pas.';
      this.offreIaResult = null;
      this.offreIaSuggestion = hasSuggestion
        ? { titre: res.titreSuggere, description: res.descriptionSugeree, categorie: realCatSuggestion }
        : null;
    } else {
      this.offreIaWarning = null;
      this.offreIaSuggestion = null;
      this.offreIaResult = res;
    }
    this.cdr.detectChanges();
  }

  acceptOffreSuggestion() {
    if (!this.offreIaSuggestion) return;
    if (this.offreIaSuggestion.titre) this.offreForm.title = this.offreIaSuggestion.titre;
    if (this.offreIaSuggestion.description) this.offreForm.description = this.offreIaSuggestion.description;
    if (this.offreIaSuggestion.categorie) this.offreForm.categorie = this.offreIaSuggestion.categorie;
    this.offreIaSuggestion = null;
    this.offreIaWarning = null;
    this.cdr.detectChanges();
    this.scheduleOffreCoherenceCheck();
  }

  supprimerOffre(offre: any) {
    Swal.fire({
      title: 'Supprimer cette offre ?', text: `"${offre.title}" sera supprimée définitivement.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#e74c3c', cancelButtonColor: '#95a5a6',
      confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler'
    }).then(result => {
      if (result.isConfirmed) {
        this.api.deleteoffre(offre.id).subscribe({
          next: () => { this.loadOffresIA(); Swal.fire({ icon: 'success', title: 'Supprimée !', timer: 1200, showConfirmButton: false }); },
          error: () => Swal.fire({ icon: 'error', title: 'Erreur lors de la suppression' })
        });
      }
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
    this.checkQuestDoublonParQuestions();
    this.scheduleReorder();
  }

  removeselectedquestion(id: number) {
    this.questform.questions = this.questform.questions.filter((x: number) => x !== id);
    this.selectedquestion = this.selectedquestion.filter(q => q.id !== id);
    this.checkQuestDoublonParQuestions();
    this.scheduleReorder();
  }

  scheduleReorder() {
    clearTimeout(this.iaReorderTimer);
    if (this.selectedquestion.length < 2) return;
    this.iaReorderTimer = setTimeout(() => {
      if (this.iaActiveCalls > 0) { this.scheduleReorder(); return; }
      this.reorderSelectedQuestions();
    }, 1500);
  }

  editingOptionsId: number | null = null;

  toggleOptionsEdit(id: number) {
    this.editingOptionsId = this.editingOptionsId === id ? null : id;
  }

  getOptionsArray(options: string): string[] {
    if (!options || !options.trim()) return [];
    return options.split(',').map(o => o.trim()).filter(o => o !== '');
  }

  get canAddQuestion(): boolean {
    if (!this.newquest.titre?.trim()) return false;
    if (this.iaDoublonWarning) return false;
    if (this.newquest.type !== 'text' && !this.newquest.options?.trim()) return false;
    if (this.newquest.type === 'scale' && !this.hasNeutralOption(this.newquest.options)) return false;
    if (this.newquest.type === 'text' && this.textQuestionPct() > 0.15) return false;
    return true;
  }

  get isTextLimitReached(): boolean {
    return this.newquest.type === 'text' && this.textQuestionPct() > 0.15;
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      text: 'Texte libre', radio: 'Choix unique',
      checkbox: 'Choix multiple', scale: 'Échelle', select: 'Liste déroulante'
    };
    return labels[type] || type;
  }

  get currentTextPct(): number {
    const total = this.selectedquestion.length;
    if (total === 0) return 0;
    return Math.round((this.selectedquestion.filter((q: any) => q.type === 'text').length / total) * 100);
  }

  private hasNeutralOption(options: string): boolean {
    const neutralWords = ['parfois', 'neutre', 'moyen', 'modéré', 'modere', 'neither', 'sometimes'];
    const opts = (options || '').toLowerCase();
    const parts = opts.split(',').map(o => o.trim()).filter(o => o !== '');
    const isNumericScale = parts.length >= 2 && parts.every(o => !isNaN(Number(o)));
    return isNumericScale || neutralWords.some(w => opts.includes(w));
  }

  private textQuestionPct(): number {
    const total = this.selectedquestion.length + 1; // +1 for the one being added
    const textCount = this.selectedquestion.filter((q: any) => q.type === 'text').length
      + (this.newquest.type === 'text' ? 1 : 0);
    return textCount / total;
  }

  forceAddQuestion() {
    this.iaTypeWarning = null;
    this.iaCoherenceWarning = null;
    this.createaddquestion();
  }

  createaddquestion() {
    if (!this.newquest.titre?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Titre manquant', text: 'Veuillez saisir le texte de la question.', confirmButtonColor: '#e67e22' });
      return;
    }
    if (this.iaDoublonWarning) {
      Swal.fire({ icon: 'warning', title: 'Doublon sémantique détecté', text: 'Cette question couvre déjà un sujet existant dans le questionnaire. Modifiez-la ou ignorez l\'avertissement pour continuer.', confirmButtonColor: '#e67e22' });
      return;
    }
    if (this.newquest.type !== 'text' && !this.newquest.options?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Choix manquants', text: 'Les choix sont obligatoires pour ce type de question. Utilisez les suggestions IA ou saisissez-les séparés par des virgules.', confirmButtonColor: '#e67e22' });
      return;
    }
    if (this.newquest.type === 'scale' && !this.hasNeutralOption(this.newquest.options)) {
      Swal.fire({ icon: 'warning', title: 'Option neutre manquante', text: 'Une échelle doit contenir une option neutre centrale (ex: "Parfois"). Utilisez les suggestions IA pour corriger.', confirmButtonColor: '#e67e22' });
      return;
    }
    this.http.post<any>(this.apiUrl + '/questions', this.newquest).subscribe({
      next: (c: any) => {
        this.selectedquestion.push(c);
        this.questions.push(c);
        this.questform.questions.push(c.id);
        this.newquest = { titre: '', type: 'text', options: '', required: false };
        this.iaAutoSuggestion = null;
        this.iaDoublonWarning = null;
        this.iaCoherenceWarning = null;
        this.iaTypeWarning = null;
        this.iaOptionsSuggestion = [];
        this.iaLoading = false;
        this.reorderSelectedQuestions();
        this.showaddquestion = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Erreur', text: err?.error || 'Erreur lors de la création.', confirmButtonColor: '#27ae60' });
      }
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

  allClients: any[] = [];
  typeContrats: string[] = [];
  professions: string[] = [];
  annees: number[] = [];

  ouvrirPartage(q: any) {
    this.selectedQuestionnaire = q;
    this.clientsFiltres = [];
    this.clientChannels = {};
    this.clientsAyantRepondu = new Set();
    this.filtre = { typeContrat: '', anneeMin: null, profession: '', primeRange: '' };
    this.showPartageModal = true;
    this.api.getClientsFiltres({}).subscribe(data => {
      this.allClients = data;
      this.clientsFiltres = data;
      data.forEach((c: any) => this.clientChannels[c.id] = 'email');
      this.typeContrats = [...new Set(data.map((c: any) => c.typeContrat).filter(Boolean))];
      this.professions  = [...new Set(data.map((c: any) => c.profession).filter(Boolean))];
      this.annees       = [...new Set(data.map((c: any) => c.anneeInscription).filter(Boolean))].sort((a: any, b: any) => a - b);
      this.cdr.detectChanges();
    });
    this.chargerReponsesQuestionnaire();
  }

  chargerReponsesQuestionnaire() {
    if (!this.selectedQuestionnaire?.id) return;
    this.http.get<any[]>(this.apiUrl + '/reponses/questionnaire/' + this.selectedQuestionnaire.id).subscribe({
      next: (reponses) => {
        this.clientsAyantRepondu = new Set(reponses.map((r: any) => r.client?.id).filter(Boolean));
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  supprimerReponseClient(clientId: number) {
    Swal.fire({
      title: 'Supprimer la réponse ?',
      text: 'La réponse de ce client sera supprimée. Il pourra recevoir le questionnaire à nouveau.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#95a5a6',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.http.delete(this.apiUrl + '/reponses/client/' + clientId + '/questionnaire/' + this.selectedQuestionnaire.id).subscribe({
        next: () => {
          this.clientsAyantRepondu.delete(clientId);
          this.cdr.detectChanges();
          this.showToastMessage('Réponse supprimée');
        },
        error: () => this.showToastMessage('Erreur lors de la suppression', 'error')
      });
    });
  }

  supprimerToutesReponses() {
    const count = this.clientsAyantRepondu.size;
    if (count === 0) { this.showToastMessage('Aucune réponse à supprimer', 'error'); return; }
    Swal.fire({
      title: 'Supprimer toutes les réponses ?',
      html: `<b>${count} réponse${count > 1 ? 's' : ''}</b> seront supprimées définitivement.<br>Tous les clients pourront recevoir ce questionnaire à nouveau.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#95a5a6',
      confirmButtonText: 'Tout supprimer',
      cancelButtonText: 'Annuler'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.http.delete(this.apiUrl + '/reponses/questionnaire/' + this.selectedQuestionnaire.id + '/all').subscribe({
        next: () => {
          this.clientsAyantRepondu = new Set();
          this.cdr.detectChanges();
          this.showToastMessage('Toutes les réponses supprimées');
        },
        error: () => this.showToastMessage('Erreur lors de la suppression', 'error')
      });
    });
  }

  supprimerReponseClientSection(clientId: number) {
    Swal.fire({
      title: 'Supprimer les réponses ?',
      text: 'Les réponses de ce client seront supprimées définitivement.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#95a5a6',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.http.delete(this.apiUrl + '/reponses/client/' + clientId + '/questionnaire/' + this.selectedQuestionnaireId).subscribe({
        next: () => { this.loadReponses(); this.showToastMessage('Réponses supprimées'); },
        error: () => this.showToastMessage('Erreur lors de la suppression', 'error')
      });
    });
  }

  supprimerToutesReponsesSection() {
    const titre = this.questionnaires.find((q: any) => q.id == this.selectedQuestionnaireId)?.titre || 'ce questionnaire';
    const count = this.clientsReponses.length;
    Swal.fire({
      title: 'Supprimer toutes les réponses ?',
      html: `<b>${count} réponse${count > 1 ? 's' : ''}</b> pour "<b>${titre}</b>" seront supprimées définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#95a5a6',
      confirmButtonText: 'Tout supprimer',
      cancelButtonText: 'Annuler'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.http.delete(this.apiUrl + '/reponses/questionnaire/' + this.selectedQuestionnaireId + '/all').subscribe({
        next: () => {
          this.loadReponses();
          this.showToastMessage('Toutes les réponses supprimées');
        },
        error: () => this.showToastMessage('Erreur lors de la suppression', 'error')
      });
    });
  }

  appliquerFiltre() {
    this.clientsFiltres = this.allClients.filter(c => {
      if (this.filtre.typeContrat && c.typeContrat !== this.filtre.typeContrat) return false;
      if (this.filtre.anneeMin   && c.anneeInscription < this.filtre.anneeMin)  return false;
      if (this.filtre.profession && c.profession !== this.filtre.profession)     return false;
      if (this.filtre.primeRange) {
        const p = c.primeAnnuelle ?? 0;
        if (this.filtre.primeRange === 'lt1000'  && p >= 1000)  return false;
        if (this.filtre.primeRange === '1000-1500' && (p < 1000 || p > 1500)) return false;
        if (this.filtre.primeRange === 'gt1500'  && p <= 1500)  return false;
      }
      return true;
    });
    this.clientChannels = {};
    this.clientsFiltres.forEach((c: any) => this.clientChannels[c.id] = 'email');
    this.cdr.detectChanges();
  }

  // Flow A: generates link and copies to clipboard → client uses /repondre
  envoyerLien(clientId: number) {
    this.api.genererLien(this.selectedQuestionnaire.id, clientId).subscribe((token: string) => {
      const lien = `http://localhost:4200/repondre?token=${token}`;
      navigator.clipboard.writeText(lien);
      this.showToastMessage('Lien copié ! Envoyez-le au client.');
    });
  }

  // Flow B: sends email or SMS directly → client uses /fill-questionnaire
  envoyerDirectement(client: any, channel: string = 'email') {
    this.clientChannels[client.id] = channel;
    const questionnaire = this.selectedQuestionnaire;
    const isEmail = channel === 'email';
    const channelColor = isEmail ? '#1a56db' : '#27ae60';

    Swal.fire({
      title: 'Génération IA en cours…',
      html: '<p style="color:#555;font-size:13px;">L\'IA rédige le message personnalisé…</p>',
      allowOutsideClick: false, allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    this.http.post<any>(this.apiUrl + '/ia/generer-message', {
      type: 'questionnaire', channel, titre: questionnaire?.titre
    }).subscribe({
      next: (msg) => {
        const sujet = msg.sujet || '';
        const corps = (msg.corps || '').replace('{NOM_CLIENT}', client.fullName || 'client');
        const contact = isEmail ? client.mail : client.tel;

        Swal.fire({
          title: `${isEmail ? '✉️ Email' : '📱 SMS'} — Aperçu IA`,
          html: `
            <p style="font-size:12px;color:#888;margin-bottom:10px;">Destinataire : <b>${client.fullName}</b> — ${contact}</p>
            ${isEmail && sujet ? `<div style="background:#f5f6ff;border-radius:8px;padding:8px 12px;margin-bottom:10px;text-align:left;font-size:12px;">
              <b style="color:#4a5568">Objet :</b> <span style="color:#1a3d2b">${sujet}</span>
            </div>` : ''}
            <div style="background:#f9fafb;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:left;font-size:12px;line-height:1.7;white-space:pre-wrap;max-height:180px;overflow-y:auto;">${corps}</div>`,
          showCancelButton: true,
          confirmButtonText: `Envoyer`,
          cancelButtonText: 'Annuler',
          confirmButtonColor: channelColor,
          cancelButtonColor: '#95a5a6',
          reverseButtons: true
        }).then(result => {
          if (!result.isConfirmed) return;
          this.http.post('/api/envoi/distribuer', {
            questionnaireId: questionnaire.id,
            distributions: [{ clientId: client.id, channel, sujet, corps }]
          }).subscribe({
            next: () => {
              this.cdr.detectChanges();
              Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: isEmail ? 'Email envoyé !' : 'SMS envoyé !', showConfirmButton: false, timer: 2500, timerProgressBar: true });
            },
            error: (err) => Swal.fire({ icon: 'error', title: 'Échec', text: err?.error?.message || 'Erreur lors de l\'envoi', confirmButtonColor: '#27ae60' })
          });
        });
      },
      error: () => {
        // AI failed — fall back to plain send without preview
        this.http.post('/api/envoi/distribuer', {
          questionnaireId: questionnaire.id,
          distributions: [{ clientId: client.id, channel }]
        }).subscribe({
          next: () => { this.cdr.detectChanges(); Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: isEmail ? 'Email envoyé !' : 'SMS envoyé !', showConfirmButton: false, timer: 2500, timerProgressBar: true }); },
          error: (err) => Swal.fire({ icon: 'error', title: 'Échec', text: err?.error?.message || 'Erreur lors de l\'envoi', confirmButtonColor: '#27ae60' })
        });
      }
    });
  }

  envoyerATous() {
    const count = this.clientsFiltres.length;
    if (count === 0) {
      Swal.fire({ icon: 'warning', title: 'Aucun client', text: 'Aucun client à contacter.', confirmButtonColor: '#27ae60' });
      return;
    }

    Swal.fire({
      title: '📢 Envoyer à tous les clients',
      html: `
        <p style="margin-bottom:18px;color:#555;">Questionnaire : <b>${this.selectedQuestionnaire?.titre}</b><br><span style="color:#888">${count} client${count > 1 ? 's' : ''} concerné${count > 1 ? 's' : ''}</span></p>
        <p style="margin-bottom:10px;font-weight:600;color:#333;">Choisissez le canal d'envoi :</p>
        <div style="display:flex;gap:14px;justify-content:center;">
          <button id="swal-email-btn" style="
            flex:1;padding:14px 10px;border:2px solid #2980b9;border-radius:12px;background:#eaf4fb;
            color:#1a6fa8;font-weight:700;font-size:15px;cursor:pointer;transition:all .2s;
            display:flex;align-items:center;justify-content:center;gap:8px;">
            ✉️ Email
          </button>
          <button id="swal-sms-btn" style="
            flex:1;padding:14px 10px;border:2px solid #27ae60;border-radius:12px;background:#eafaf1;
            color:#1e8449;font-weight:700;font-size:15px;cursor:pointer;transition:all .2s;
            display:flex;align-items:center;justify-content:center;gap:8px;">
            📱 SMS
          </button>
        </div>`,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Annuler',
      cancelButtonColor: '#95a5a6',
      didOpen: () => {
        const emailBtn = document.getElementById('swal-email-btn');
        const smsBtn   = document.getElementById('swal-sms-btn');
        emailBtn?.addEventListener('click', () => Swal.close(), false);
        smsBtn?.addEventListener('click',   () => Swal.close(), false);
        emailBtn?.addEventListener('click', () => this.doEnvoyerATous('email', count));
        smsBtn?.addEventListener('click',   () => this.doEnvoyerATous('sms', count));
      }
    });
  }

  doEnvoyerATous(channel: string, count: number) {
    Swal.fire({
      title: 'Génération IA en cours…',
      html: '<p style="color:#555;font-size:13px;">L\'IA rédige le message à envoyer à tous…</p>',
      allowOutsideClick: false, allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    this.http.post<any>(this.apiUrl + '/ia/generer-message', {
      type: 'questionnaire', channel, titre: this.selectedQuestionnaire?.titre
    }).subscribe({
      next: (msg) => {
        const sujet = msg.sujet || '';
        const corps = msg.corps || '';
        const isEmail = channel === 'email';

        Swal.fire({
          title: `${isEmail ? '✉️ Email' : '📱 SMS'} — Aperçu IA`,
          html: `
            <p style="font-size:12px;color:#888;margin-bottom:10px;"><b>${count} client${count > 1 ? 's' : ''}</b> recevront ce message</p>
            ${isEmail && sujet ? `<div style="background:#f5f6ff;border-radius:8px;padding:8px 12px;margin-bottom:10px;text-align:left;font-size:12px;">
              <b style="color:#4a5568">Objet :</b> <span style="color:#1a3d2b">${sujet}</span>
            </div>` : ''}
            <div style="background:#f9fafb;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:left;font-size:12px;line-height:1.7;white-space:pre-wrap;max-height:160px;overflow-y:auto;">${corps.replace('{NOM_CLIENT}', '[Nom du client]')}</div>
            <p style="font-size:11px;color:#999;margin-top:6px;">{NOM_CLIENT} sera remplacé par le prénom de chaque client.</p>`,
          showCancelButton: true,
          confirmButtonText: `Envoyer à ${count} client${count > 1 ? 's' : ''}`,
          cancelButtonText: 'Annuler',
          confirmButtonColor: isEmail ? '#1a56db' : '#27ae60',
          cancelButtonColor: '#95a5a6',
          reverseButtons: true
        }).then(r => {
          if (!r.isConfirmed) return;
          this.sendATous(channel, count, sujet, corps);
        });
      },
      error: () => this.sendATous(channel, count, '', '')
    });
  }

  private sendATous(channel: string, count: number, sujet: string, corps: string) {
    Swal.fire({ title: 'Envoi en cours...', html: `Envoi à <b>${count}</b> client${count > 1 ? 's' : ''}…`, allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });

    const distributions = this.clientsFiltres.map((c: any) => ({ clientId: c.id, channel, sujet, corps }));

    this.http.post('/api/envoi/distribuer', {
      questionnaireId: this.selectedQuestionnaire.id,
      distributions
    }).subscribe({
      next: () => {
        this.showPartageModal = false;
        this.cdr.detectChanges();
        Swal.fire({ icon: 'success', title: 'Envoyé !', html: `Le questionnaire a été envoyé à <b>${count} client${count > 1 ? 's' : ''}</b> via <b>${channel === 'sms' ? 'SMS' : 'Email'}</b>.`, confirmButtonColor: '#27ae60', confirmButtonText: 'Parfait !' });
      },
      error: () => Swal.fire({ icon: 'error', title: 'Erreur d\'envoi', text: 'Une erreur est survenue. Veuillez réessayer.', confirmButtonColor: '#27ae60' })
    });
  }

  showToastMessage(message: string, type = 'success') {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: type === 'error' ? 'error' : 'success',
      title: message,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    });
  }

  

  myTeams: any[] = [];
  questTab = 'mine';           
  showDelegateModal = false;
  delegateform: any = { gestionnaireId: null, titreHint: '' };

  loadMyTeams() {
    this.api.getTeams().subscribe({
      next: (teams) => {
        this.myTeams = teams.filter((t: any) => t.directeur?.id === this.gestionnaire.id);
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }


  get allTeamMembers(): any[] {
    const seen = new Set<number>();
    const result: any[] = [];
    for (const team of this.myTeams) {
      for (const m of (team.members || [])) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          result.push({ ...m, teamName: team.name });
        }
      }
    }
    return result;
  }


  questionnairesForTeam(team: any): any[] {
    const memberIds = new Set((team.members || []).map((m: any) => m.id));
    return this.questionnaires.filter(q => memberIds.has(q.gestionnaire?.id));
  }

  
  get myOwnQuestionnaires(): any[] {
    return this.questionnaires.filter(q => q.gestionnaire?.id === this.gestionnaire.id);
  }

  openDelegateModal() {
    this.delegateform = { gestionnaireId: null, titreHint: '' };
    this.showDelegateModal = true;
  }

  sendDelegateRequest() {
    if (!this.delegateform.gestionnaireId) return;
    this.api.sendDelegationRequest(
      this.gestionnaire.id,
      this.delegateform.gestionnaireId,
      this.delegateform.titreHint
    ).subscribe({
      next: () => {
        this.showDelegateModal = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Demande envoyée !',
          text: 'Le gestionnaire recevra une notification pour créer le questionnaire.',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: () => {
        this.showDelegateModal = false;
        this.cdr.detectChanges();
        Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible d\'envoyer la demande.' });
      }
    });
  }

  openWizard() {
    this.editingquest = null;
    this.selectedquestion = [];
    this.questform = { titre: '', description: '', questions: [] };
    this.questionSearchText = '';
    this.showaddquestion = false;
    this.newquest = { titre: '', type: 'text', options: '', required: false };
    this.iaAutoSuggestion = null;
    this.iaDoublonWarning = null;
    this.iaEnsembleWarning = null;
    this.iaQuestDoublonWarning = null;
    this.iaOptionsSuggestion = [];
    clearTimeout(this.iaReorderTimer);
    this.showquestform = true;
    this.activeSection = 'questionnaires';
  }

  onQuestTitreChange() {
    // Title change alone doesn't trigger doublon check — question overlap is checked when questions change
  }

  checkQuestDoublonParQuestions() {
    this.iaQuestDoublonWarning = null;
    if (this.selectedquestion.length < 2) return;
    const newIds = new Set<number>(this.selectedquestion.map((q: any) => q.id));
    const existingQuestionnaires = this.questionnaires.filter((q: any) =>
      !this.editingquest || q.id !== this.editingquest.id
    );
    let maxOverlap = 0;
    let worstMatch: any = null;
    for (const existing of existingQuestionnaires) {
      const existingIds: number[] = (existing.questions || []).map((q: any) => q.id ?? q);
      if (existingIds.length === 0) continue;
      const common = existingIds.filter((id: number) => newIds.has(id)).length;
      const union = newIds.size + existingIds.length - common;
      const overlap = common / union; // Jaccard similarity
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        worstMatch = existing;
      }
    }
    if (maxOverlap > 0.49 && worstMatch) {
      this.iaQuestDoublonWarning = {
        doublon: true,
        questionnaireSimilaire: worstMatch.titre,
        similarite: maxOverlap,
        message: `Ce questionnaire partage ${Math.round(maxOverlap * 100)}% de ses questions avec "${worstMatch.titre}". Modifiez les questions pour le différencier.`
      };
    }
    this.cdr.detectChanges();
  }

  onTitreChange() {
    clearTimeout(this.iaDebounceTimer);
    this.iaAutoSuggestion = null;
    this.iaDoublonWarning = null;
    this.iaCoherenceWarning = null;
    this.iaTypeWarning = null;
    this.iaOptionsSuggestion = [];
    this.iaLoading = false;
    this.cdr.detectChanges();
    if (!this.newquest.titre || this.newquest.titre.length < 5) return;
    this.iaLoading = true;
    this.cdr.detectChanges();
    this.iaDebounceTimer = setTimeout(() => this.autoSuggestQuestion(), 1200);
  }

  onTypeChange() {
    this.iaTypeWarning = null;
    this.iaOptionsSuggestion = [];
    this.iaAutoSuggestion = null;
    if (!this.newquest.titre || this.newquest.titre.length < 5) {
      if (this.newquest.type === 'scale') {
        this.iaOptionsSuggestion = ['Toujours', 'Souvent', 'Parfois', 'Rarement', 'Jamais'];
      }
      this.cdr.detectChanges();
      return;
    }
    this.iaLoading = true;
    this.cdr.detectChanges();
    this.autoSuggestQuestion();
  }

  autoSuggestQuestion() {
    if (!this.newquest.titre || this.newquest.titre.length < 5) { this.iaLoading = false; return; }
    this.iaAutoSuggestion = null;
    this.iaDoublonWarning = null;
    this.iaCoherenceWarning = null;
    this.iaTypeWarning = null;
    this.iaOptionsSuggestion = [];

    const existingTitles = [
      ...this.questions.map((q: any) => q.titre || q.title),
      ...this.selectedquestion.map((q: any) => q.titre || q.title),
    ].filter((t: string) => t && t.trim().length > 0);

    const selectedTitles = this.selectedquestion.length >= 2
      ? this.selectedquestion.map((q: any) => q.titre || q.title).filter(Boolean)
      : [];

    this.iaActiveCalls++;
    this.http.post<any>(this.apiUrl + '/ia/analyser-question', {
      titre: this.newquest.titre,
      type: this.newquest.type || 'text',
      existingTitles,
      selectedTitles
    }).subscribe({
      next: (res) => {
        this.iaActiveCalls = Math.max(0, this.iaActiveCalls - 1);
        const normalize = (s: string) => s?.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s?[?!.]+$/, '');
        if (res.needsImprovement && res.titreReformule && normalize(res.titreReformule) !== normalize(this.newquest.titre)) {
          this.iaAutoSuggestion = { titreReformule: res.titreReformule, explication: res.reformuleExplication, needsImprovement: res.needsImprovement };
        }
        if (res.doublon && (res.doublonSimilarite ?? 0) >= 0.85) {
          this.iaDoublonWarning = { doublon: true, questionSimilaire: { titre: res.doublonTitre, similarite: res.doublonSimilarite }, message: res.doublonMessage };
        }
        if (res.coherente === false) {
          this.iaCoherenceWarning = { coherente: false, message: res.coherenceMessage, conseil: res.conseil };
        }
        if (res.typeCompatible === false) {
          this.iaTypeWarning = { compatible: false, message: res.typeMessage, typeRecommande: res.typeRecommande };
        }
        if (res.options?.length > 0) {
          this.iaOptionsSuggestion = res.options;
        }
        this.iaLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.iaActiveCalls = Math.max(0, this.iaActiveCalls - 1); this.iaLoading = false; this.cdr.detectChanges(); }
    });
  }

  verifierEnsemble() {
    clearTimeout(this.iaEnsembleTimer);
    if (this.selectedquestion.length < 3) { this.iaEnsembleWarning = null; return; }
    this.iaEnsembleTimer = setTimeout(() => {
      if (this.iaActiveCalls > 0) { this.verifierEnsemble(); return; }
      const questions = this.selectedquestion.map((q: any) => q.titre || q.title).filter(Boolean);
      this.iaActiveCalls++;
      this.http.post<any>(this.apiUrl + '/ia/verifier-ensemble', { questions }).subscribe({
        next: (res) => {
          this.iaActiveCalls = Math.max(0, this.iaActiveCalls - 1);
          this.iaEnsembleWarning = res?.compatible === false ? res : null;
          this.cdr.detectChanges();
        },
        error: () => { this.iaActiveCalls = Math.max(0, this.iaActiveCalls - 1); }
      });
    }, 2000);
  }

  reorderSelectedQuestions() {
    if (this.selectedquestion.length < 2) return;
    this.iaReordering = true;
    const score = (q: any): number => {
      const t = (q.titre || q.title || '').toLowerCase();
      const type = (q.type || '').toLowerCase();
      if (type === 'text') return 7;
      if (/satisf|globale|impression|recommand|fidél/.test(t)) return 1;
      if (/service|sinistre|rembours|contrat|rapidit|clart|canal|communicat|contact|accueil|personnel/.test(t)) return 2;
      if (/données|personnelles|transparence|confiance|éthique|vie privée|information.*reçu/.test(t)) return 3;
      if (/amélioration|suggestion|fonctionnalit|problème|concurrent|souhait|aimer|manque/.test(t)) return 4;
      if (/ancienneté|années|âge|type de contrat|profession|durée|client depuis|depuis combien/.test(t)) return 5;
      if (/recommand|mot de fin|conclusion|commentaire final|dernier/.test(t)) return 6;
      return 3;
    };
    this.selectedquestion = [...this.selectedquestion].sort((a, b) => score(a) - score(b));
    this.questform.questions = this.selectedquestion.map((q: any) => q.id);
    this.iaReordering = false;
    this.cdr.detectChanges();
  }

  suggestOptions() {
    if (!this.newquest.titre || this.newquest.type === 'text') return;
    this.iaOptionsSuggestion = [];

    if (this.newquest.type === 'scale') {
      this.iaOptionsSuggestion = ['Toujours', 'Souvent', 'Parfois', 'Rarement', 'Jamais'];
      this.cdr.detectChanges();
      return;
    }

    const currentOptions = this.newquest.options
      ? this.newquest.options.split(',').map((o: string) => o.trim()).filter(Boolean)
      : [];
    this.http.post<any>(this.apiUrl + '/ia/valider-choix', {
      titre: this.newquest.titre,
      type: this.newquest.type,
      options: currentOptions
    }).subscribe({
      next: (res) => {
        if (!res?.error && res?.optionsSuggerees?.length) {
          this.iaOptionsSuggestion = res.optionsSuggerees;
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  acceptOptionsSuggestion() {
    this.newquest.options = this.iaOptionsSuggestion.join(', ');
    this.iaOptionsSuggestion = [];
    this.cdr.detectChanges();
  }

  acceptAutoSuggestion() {
    this.newquest = { ...this.newquest, titre: this.iaAutoSuggestion.titreReformule };
    this.iaAutoSuggestion = null;
    this.iaDoublonWarning = null;
    this.iaOptionsSuggestion = [];
    this.cdr.detectChanges();
  }

  saveCreateQuestionnaire() {
    if (!this.questform.titre) {
      this.showToastMessage('Donnez un titre au questionnaire', 'error');
      return;
    }
    if (this.iaQuestDoublonWarning) return;
    if (this.selectedquestion.length >= 3) {
      const questions = this.selectedquestion.map((q: any) => q.titre || q.title).filter(Boolean);
      this.iaActiveCalls++;
      this.http.post<any>(this.apiUrl + '/ia/verifier-ensemble', { questions }).subscribe({
        next: (res) => {
          this.iaActiveCalls = Math.max(0, this.iaActiveCalls - 1);
          this.iaEnsembleWarning = res?.compatible === false ? res : null;
          if (this.iaEnsembleWarning) { this.cdr.detectChanges(); return; }
          this.doSaveQuestionnaire();
        },
        error: () => {
          this.iaActiveCalls = Math.max(0, this.iaActiveCalls - 1);
          this.doSaveQuestionnaire();
        }
      });
    } else {
      this.doSaveQuestionnaire();
    }
  }

  private doSaveQuestionnaire() {
    const payload = {
      titre: this.questform.titre,
      description: this.questform.description || '',
      gestionnaire: { id: this.gestionnaire.id },
      questions: [...this.selectedquestion]
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
