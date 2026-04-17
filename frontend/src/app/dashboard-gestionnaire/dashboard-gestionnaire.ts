import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';
import { ViewChild, ElementRef } from '@angular/core';
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

  notifications: any[] = [];
  unreadNotifCount = 0;
  showNotifPanel = false;

  private platformId = inject(PLATFORM_ID);
  private iaDebounceTimer: any = null;

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

  private loadTotalReponses(questionnaireIds: number[]) {
    if (!questionnaireIds.length) { this.totalReponses = 0; this.cdr.detectChanges(); return; }
    this.http.get<any[]>(this.apiUrl + '/reponses').subscribe({
      next: (all) => {
        const idSet = new Set(questionnaireIds);
        const relevant = all.filter(r => idSet.has(r.questionnaire?.id));
        const unique = new Set(relevant.map(r => `${r.client?.id}-${r.questionnaire?.id}`));
        this.countUp(unique.size, v => { this.totalReponses = v; this.cdr.detectChanges(); });
      },
      error: () => {}
    });
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
        labels: ['Total clients', 'Ont répondu'],
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
            error: ()    => setTimeout(() => this.renderReponsesParQuestion(this.allClients.length, clients), 150)
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

  private buildOffreSelectHtml(preselectedId?: number): string {
    if (!this.offres.length) return '<p style="color:#e74c3c">Aucune offre disponible.</p>';
    let opts = this.offres.map(o =>
      `<option value="${o.id}" ${preselectedId === o.id ? 'selected' : ''}>${o.title}</option>`
    ).join('');
    return `<select id="swal-offre-select" class="swal2-input" style="margin-top:8px">
              <option value="">-- Choisir une offre --</option>${opts}
            </select>`;
  }

  envoyerOffreClient(client: any) {
    if (!this.offres.length) {
      Swal.fire({ icon: 'warning', title: 'Aucune offre', text: 'Créez d\'abord des offres dans l\'espace admin.', confirmButtonColor: '#27ae60' });
      return;
    }

    const rec = this.recommendations.find((r: any) =>
      r.clientKpi?.client?.id === client.id
    );

    const sentimentEmoji = rec ? this.getSentimentEmoji(rec.clientKpi?.sentiment) : '';
    const aiOffre = rec ? (rec.finalOffre || rec.aiRecommendedOffre) : null;
    const score = rec?.clientKpi?.score ?? null;

    const recHtml = rec ? `
      <div style="background:#f0faf4;border:1px solid #a9dfbf;border-radius:10px;padding:12px 16px;margin-bottom:14px;text-align:left;">
        <div style="font-weight:700;color:#1a3d2b;margin-bottom:6px;">Suggestion IA</div>
        <div style="font-size:13px;color:#555;margin-bottom:4px;">
          Score : <b style="color:#27ae60">${score}/100</b> &nbsp; ${sentimentEmoji} <b>${rec.clientKpi?.sentiment || ''}</b>
        </div>
        <div style="font-size:13px;color:#555;">
          Offre recommandée : <b style="color:#2980b9">${aiOffre?.title || '—'}</b>
        </div>
        ${aiOffre ? `<button type="button" id="swal-use-ai-btn"
          onclick="document.getElementById('swal-offre-select').value='${aiOffre.id}';this.style.background='#27ae60';this.textContent='Sélectionnée'"
          style="margin-top:10px;background:#2ecc71;color:white;border:none;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;">
          Utiliser cette offre
        </button>` : ''}
      </div>` : '';

    Swal.fire({
      title: `Envoyer une offre à ${client.fullName || 'ce client'}`,
      html: recHtml + this.buildOffreSelectHtml(aiOffre?.id),
      showCancelButton: true,
      confirmButtonText: 'Envoyer par email',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#27ae60',
      cancelButtonColor: '#95a5a6',
      reverseButtons: true,
      preConfirm: () => {
        const sel = document.getElementById('swal-offre-select') as HTMLSelectElement;
        if (!sel || !sel.value) { Swal.showValidationMessage('Veuillez sélectionner une offre.'); return false; }
        return sel.value;
      }
    }).then(result => {
      if (!result.isConfirmed || !result.value) return;
      const offreId = Number(result.value);

      const sendOffer = () => this.api.envoyerOffre(offreId, [client.id]).subscribe({
        next: () => Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Offre envoyée !', showConfirmButton: false, timer: 2500, timerProgressBar: true }),
        error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible d\'envoyer l\'offre.', confirmButtonColor: '#27ae60' })
      });

      if (rec) {
        if (aiOffre && offreId === aiOffre.id) {
          this.http.put(this.apiUrl + '/recommendations/' + rec.id + '/accept', {}).subscribe({ next: () => sendOffer(), error: () => sendOffer() });
        } else {
          this.http.put(this.apiUrl + '/recommendations/' + rec.id + '/override/' + offreId, {}).subscribe({ next: () => sendOffer(), error: () => sendOffer() });
        }
      } else {
        sendOffer();
      }
    });
  }

  envoyerOffreTous() {
    if (!this.offres.length) {
      Swal.fire({ icon: 'warning', title: 'Aucune offre', text: 'Créez d\'abord des offres dans l\'espace admin.', confirmButtonColor: '#27ae60' });
      return;
    }
    const count = this.clientsReponses.length;
    const clientIds = this.clientsReponses.map(e => e.client?.id).filter(Boolean);
    const titre = this.questionnaires.find((q: any) => q.id == this.selectedQuestionnaireId)?.titre || 'ce questionnaire';

    
    const offreCountMap = new Map<number, { offre: any; clients: number }>();
    let noRecCount = 0;
    for (const e of this.clientsReponses) {
      const rec = this.recommendations.find((r: any) =>
        r.clientKpi?.client?.id === e.client?.id
      );
      const aiOffre = rec ? (rec.finalOffre || rec.aiRecommendedOffre) : null;
      if (aiOffre) {
        const entry = offreCountMap.get(aiOffre.id);
        if (entry) entry.clients++;
        else offreCountMap.set(aiOffre.id, { offre: aiOffre, clients: 1 });
      } else {
        noRecCount++;
      }
    }

    // Sort by most recommended, pick the top one
    const offreCounts = Array.from(offreCountMap.values())
      .sort((a, b) => b.clients - a.clients);
    const topOffre = offreCounts[0]?.offre ?? null;

    const pieColors = ['#27ae60','#1a56db','#e67e22','#8e44ad','#e74c3c','#16a085','#f39c12','#2980b9'];
    const noRecHtml = noRecCount > 0
      ? `<p style="font-size:12px;color:#999;margin-top:6px;">${noRecCount} client(s) sans recommandation IA recevront aussi l'offre sélectionnée.</p>`
      : '';

    const aiSummary = offreCounts.length > 0
      ? `<div style="background:#f0faf4;border:1px solid #a9dfbf;border-radius:10px;padding:14px;margin-bottom:14px;">
           <div style="font-weight:700;color:#1a3d2b;margin-bottom:10px;">Analyse IA — ${count} client${count > 1 ? 's' : ''}</div>
           <canvas id="swal-pie-chart" width="260" height="260" style="display:block;margin:0 auto;max-width:260px;max-height:260px;"></canvas>
           ${noRecHtml}
         </div>`
      : `<div style="background:#fff8e1;border-radius:8px;padding:10px;margin-bottom:14px;font-size:13px;color:#795548;">
           Aucune recommandation IA disponible. Sélectionnez une offre manuellement.
         </div>`;

    Swal.fire({
      title: `Envoyer une offre à tous`,
      html: `
        <p style="margin-bottom:12px;color:#555;font-size:13px;">Questionnaire : <b>${titre}</b></p>
        ${aiSummary}
        ${this.buildOffreSelectHtml(topOffre?.id)}`,
      showCancelButton: true,
      confirmButtonText: `Envoyer à ${count} client${count > 1 ? 's' : ''}`,
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#27ae60',
      cancelButtonColor: '#95a5a6',
      reverseButtons: true,
      width: 560,
      didOpen: () => {
        const canvas = document.getElementById('swal-pie-chart') as HTMLCanvasElement;
        if (!canvas || offreCounts.length === 0) return;
        new Chart(canvas, {
          type: 'pie',
          data: {
            labels: offreCounts.map(({ offre, clients }) => `${offre.title} (${clients})`),
            datasets: [{
              data: offreCounts.map(e => e.clients),
              backgroundColor: offreCounts.map((_, i) => pieColors[i % pieColors.length]),
              borderWidth: 2,
              borderColor: '#fff'
            }]
          },
          options: {
            plugins: {
              legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const pct = Math.round((ctx.parsed / count) * 100);
                    return ` ${ctx.label}: ${pct}%`;
                  }
                }
              }
            }
          }
        });
      },
      preConfirm: () => {
        const sel = document.getElementById('swal-offre-select') as HTMLSelectElement;
        if (!sel || !sel.value) { Swal.showValidationMessage('Veuillez sélectionner une offre.'); return false; }
        return sel.value;
      }
    }).then(result => {
      if (!result.isConfirmed || !result.value) return;
      const offreId = Number(result.value);
      Swal.fire({ title: 'Envoi en cours...', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
      this.api.envoyerOffre(offreId, clientIds).subscribe({
        next: (res: any) => Swal.fire({ icon: 'success', title: 'Envoyé !', html: `L'offre a été envoyée à <b>${res.sent ?? count} client${count > 1 ? 's' : ''}</b> par email.`, confirmButtonColor: '#27ae60' }),
        error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible d\'envoyer les offres.', confirmButtonColor: '#27ae60' })
      });
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
  offreForm: any = { title: '', description: '', categorie: 'general', scoreMin: 0, scoreMax: 100, active: true };
  editingOffre: any = null;

  openAddOffre() {
    this.editingOffre = null;
    this.offreForm = { title: '', description: '', categorie: 'general', scoreMin: 0, scoreMax: 100, active: true };
    this.showOffreForm = true;
  }

  openEditOffre(offre: any) {
    this.editingOffre = offre;
    this.offreForm = {
      title: offre.title, description: offre.description,
      categorie: offre.categorie || 'general',
      scoreMin: offre.scoreMin ?? 0, scoreMax: offre.scoreMax ?? 100,
      active: offre.active !== false
    };
    this.showOffreForm = true;
  }

  saveOffre() {
    if (!this.offreForm.title?.trim() || !this.offreForm.description?.trim()) {
      this.showToastMessage('Titre et description sont obligatoires', 'error'); return;
    }
    if (this.editingOffre) {
      this.api.updateoffre(this.editingOffre.id, this.offreForm).subscribe({
        next: () => { this.showOffreForm = false; this.loadOffresIA(); this.showToastMessage('Offre modifiée'); },
        error: () => this.showToastMessage('Erreur lors de la modification', 'error')
      });
    } else {
      this.api.addoffre(this.offreForm).subscribe({
        next: () => { this.showOffreForm = false; this.loadOffresIA(); this.showToastMessage('Offre ajoutée'); },
        error: () => this.showToastMessage('Erreur lors de l\'ajout', 'error')
      });
    }
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
  }

  removeselectedquestion(id: number) {
    this.questform.questions = this.questform.questions.filter((x: number) => x !== id);
    this.selectedquestion = this.selectedquestion.filter(q => q.id !== id);
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
    if (this.iaCoherenceWarning) return false;
    if (this.newquest.type !== 'text' && !this.newquest.options?.trim()) return false;
    if (this.newquest.type === 'scale' && !this.hasNeutralOption(this.newquest.options)) return false;
    if (this.newquest.type === 'text' && this.textQuestionPct() > 0.15) return false;
    return true;
  }

  get currentTextPct(): number {
    const total = this.selectedquestion.length;
    if (total === 0) return 0;
    return Math.round((this.selectedquestion.filter((q: any) => q.type === 'text').length / total) * 100);
  }

  private hasNeutralOption(options: string): boolean {
    const neutralWords = ['parfois', 'neutre', 'moyen', 'modéré', 'modere', 'neither', 'sometimes'];
    const opts = (options || '').toLowerCase();
    return neutralWords.some(w => opts.includes(w));
  }

  private textQuestionPct(): number {
    const total = this.selectedquestion.length + 1; // +1 for the one being added
    const textCount = this.selectedquestion.filter((q: any) => q.type === 'text').length
      + (this.newquest.type === 'text' ? 1 : 0);
    return textCount / total;
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
    if (this.newquest.type === 'text' && this.textQuestionPct() > 0.15) {
      Swal.fire({ icon: 'warning', title: 'Limite atteinte (15%)', text: 'Les questions à texte libre ne peuvent pas dépasser 15% du questionnaire. Privilégiez un type avec choix.', confirmButtonColor: '#e67e22' });
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
  envoyerDirectement(client: any) {
    const channel = this.clientChannels[client.id] || 'email';
    Swal.fire({
      title: `Envoyer à ${client.fullName} ?`,
      html: `<b>${channel === 'sms' ? 'SMS' : 'Email'}</b> → ${channel === 'sms' ? client.tel : client.mail}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#27ae60',
      cancelButtonColor: '#95a5a6',
      confirmButtonText: 'Envoyer',
      cancelButtonText: 'Annuler',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) return;
      this.http.post('/api/envoi/distribuer', {
        questionnaireId: this.selectedQuestionnaire.id,
        distributions: [{ clientId: client.id, channel }]
      }).subscribe({
        next: () => {
          this.cdr.detectChanges();
          Swal.fire({
            toast: true, position: 'top-end', icon: 'success',
            title: channel === 'sms' ? 'SMS envoyé !' : 'Email envoyé !',
            showConfirmButton: false, timer: 2500, timerProgressBar: true
          });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Erreur lors de l\'envoi';
          Swal.fire({ icon: 'error', title: 'Échec', text: msg, confirmButtonColor: '#27ae60' });
        }
      });
    });
  }

  envoyerATous() {
    const count = this.clientsFiltres.length;
    if (count === 0) {
      Swal.fire({ icon: 'warning', title: 'Aucun client', text: 'Aucun client à contacter.', confirmButtonColor: '#27ae60' });
      return;
    }

    Swal.fire({
      title: 'Envoyer à tous ?',
      html: `Vous allez envoyer le questionnaire <b>"${this.selectedQuestionnaire?.titre}"</b><br>à <b>${count} client${count > 1 ? 's' : ''}</b>.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#27ae60',
      cancelButtonColor: '#95a5a6',
      confirmButtonText: 'Envoyer maintenant',
      cancelButtonText: 'Annuler',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: 'Envoi en cours...',
        html: `Envoi à <b>${count}</b> client${count > 1 ? 's' : ''}...`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

      const distributions = this.clientsFiltres.map(c => ({
        clientId: c.id,
        channel: this.clientChannels[c.id] || 'email'
      }));

      this.http.post('/api/envoi/distribuer', {
        questionnaireId: this.selectedQuestionnaire.id,
        distributions
      }).subscribe({
        next: () => {
          this.showPartageModal = false;
          this.cdr.detectChanges();
          Swal.fire({
            icon: 'success',
            title: 'Envoyé !',
            html: `Le questionnaire a été envoyé à <b>${count} client${count > 1 ? 's' : ''}</b> avec succès.`,
            confirmButtonColor: '#27ae60',
            confirmButtonText: 'Parfait !'
          });
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Erreur d\'envoi',
            text: 'Une erreur est survenue. Veuillez réessayer.',
            confirmButtonColor: '#27ae60'
          });
        }
      });
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
    this.iaOptionsSuggestion = [];
    this.showquestform = true;
    this.activeSection = 'questionnaires';
  }

  onTitreChange() {
    clearTimeout(this.iaDebounceTimer);
    this.iaAutoSuggestion = null;
    this.iaDoublonWarning = null;
    this.iaCoherenceWarning = null;
    this.iaLoading = false;
    if (!this.newquest.titre || this.newquest.titre.length < 5) return;
    this.iaLoading = true;
    this.cdr.detectChanges();
    this.iaDebounceTimer = setTimeout(() => this.autoSuggestQuestion(), 800);
  }

  autoSuggestQuestion() {
    if (!this.newquest.titre || this.newquest.titre.length < 5) { this.iaLoading = false; return; }
    this.iaAutoSuggestion = null;
    this.iaDoublonWarning = null;
    this.iaCoherenceWarning = null;
    this.iaOptionsSuggestion = [];

    let pending = 0;
    const done = () => { if (--pending === 0) { this.iaLoading = false; this.cdr.detectChanges(); } };

    const existingTitles = [
      ...this.questions.map((q: any) => q.titre || q.title),
      ...this.selectedquestion.map((q: any) => q.titre || q.title),
    ].filter((t: string) => t && t.trim().length > 0);

    // 1. Reformulation for ALL question types
    pending++;
    this.http.post<any>(this.apiUrl + '/ia/reformuler-question', {
      titre: this.newquest.titre,
      type: this.newquest.type || 'text'
    }).subscribe({
      next: (res) => {
        if (res?.titreReformule && res.titreReformule !== this.newquest.titre) this.iaAutoSuggestion = res;
        done();
      },
      error: () => done()
    });

    // 2. Duplicate detection
    if (existingTitles.length > 0) {
      pending++;
      this.http.post<any>(this.apiUrl + '/ia/check-doublon', {
        titre: this.newquest.titre,
        roleQuestionnaire: 'SATISFACTION_CLIENT',
        existingTitles
      }).subscribe({
        next: (res) => { if (res?.doublon === true) this.iaDoublonWarning = res; done(); },
        error: () => done()
      });
    }

    // 3. Coherence check (only when 2+ questions already selected)
    if (this.selectedquestion.length >= 2) {
      const selectedTitles = this.selectedquestion.map((q: any) => q.titre || q.title).filter(Boolean);
      pending++;
      this.http.post<any>(this.apiUrl + '/ia/verifier-coherence', {
        titre: this.newquest.titre,
        existingTitles: selectedTitles
      }).subscribe({
        next: (res) => { if (res?.coherente === false) this.iaCoherenceWarning = res; done(); },
        error: () => done()
      });
    }

    // 4. Text % warning — only when existing questions already push it over 15%
    if (this.newquest.type === 'text' && this.selectedquestion.length > 0 && this.textQuestionPct() > 0.15) {
      this.iaCoherenceWarning = {
        coherente: false,
        message: `Les questions à texte libre représentent déjà ${this.currentTextPct}% du questionnaire (max 15%).`,
        conseil: 'Choisissez un type avec choix (radio, checkbox, échelle).'
      };
    }

    // 5. Option suggestions for non-text types
    if (this.newquest.type !== 'text') this.suggestOptions();
  }

  reorderSelectedQuestions() {
    if (this.selectedquestion.length < 2) return;
    this.iaReordering = true;
    const payload = this.selectedquestion.map((q: any) => ({
      id: q.id,
      titre: q.titre || q.title,
      type: q.type
    }));
    this.http.post<any[]>(this.apiUrl + '/ia/reordonner', { questions: payload }).subscribe({
      next: (ordered) => {
        if (ordered?.length) {
          this.selectedquestion = ordered;
          this.questform.questions = ordered.map((q: any) => q.id);
        }
        this.iaReordering = false;
        this.cdr.detectChanges();
      },
      error: () => { this.iaReordering = false; }
    });
  }

  suggestOptions() {
    if (!this.newquest.titre || this.newquest.type === 'text') return;
    this.iaOptionsSuggestion = [];

    // Scale: always use the standard 5-point scale instantly, no AI call needed
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
