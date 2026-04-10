import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
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
  dragoverIndex = -1;

  showPartageModal = false;
  clientsFiltres: any[] = [];
  filtre = { typeContrat: '', anneeMin: null, profession: '' };
  clientChannels: { [id: number]: string } = {};

  notifications: any[] = [];
  unreadNotifCount = 0;
  showNotifPanel = false;

  private platformId = inject(PLATFORM_ID);

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
    this.wsService.questionnaires$.subscribe(data => {
      this.questionnaires = data.map(q => this.mapStatut(q));
      this.updateStats();
      this.cdr.detectChanges();
    });
    this.wsService.question$.subscribe(data => { this.questions = data; this.cdr.detectChanges(); });

    if (this.canManageAll()) {
      this.wsService.adminNotifications$.subscribe(data => {
        const allowed = ['DEMANDE_PUBLICATION', 'TOUS_ONT_REPONDU'];
        const filtered = data.filter((n: any) => allowed.includes(n.type));
        this.notifications = filtered;
        this.unreadNotifCount = filtered.filter((n: any) => !n.vue).length;
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
    if (this.activeSection === 'offres') return 'Offres';
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
    this.loadTotalReponses(mine.map(q => q.id));
  }

  private loadTotalReponses(questionnaireIds: number[]) {
    if (!questionnaireIds.length) { this.totalReponses = 0; this.cdr.detectChanges(); return; }
    this.http.get<any[]>(this.apiUrl + '/reponses').subscribe({
      next: (all) => {
        const idSet = new Set(questionnaireIds);
        const relevant = all.filter(r => idSet.has(r.questionnaire?.id));
        const unique = new Set(relevant.map(r => `${r.client?.id}-${r.questionnaire?.id}`));
        this.totalReponses = unique.size;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
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
      const wasNotBrouillon = this.editingquest.statut !== 'BROUILLON';
      const payload: any = {
        titre: this.questform.titre,
        description: this.questform.description,
        questions: this.selectedquestion
      };
      if (wasNotBrouillon) payload.statut = 'BROUILLON';
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
    return this.canManageAll() || this.isMyQuestionnaire(q);
  }

  canDelete(q: any): boolean {
    return this.canManageAll() || this.isMyQuestionnaire(q);
  }

  canRequestPublication(q: any): boolean {
    return !this.canManageAll() && this.isMyQuestionnaire(q) &&
      (q.statut === 'BROUILLON' || q.statut === 'REJETE');
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

  showClientReponsesModal = false;
  selectedClientData: any = null;
  selectedClientReponses: any[] = [];

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
        Swal.fire({
          title: `📋 ${titre}`,
          html: nb === 0
            ? `<p>Aucune réponse reçue pour ce questionnaire.</p>`
            : `<p><b>${clients} client${clients > 1 ? 's' : ''}</b> ont répondu à ce questionnaire.</p>`,
          icon: nb === 0 ? 'info' : 'success',
          confirmButtonText: nb === 0 ? 'OK' : '📊 Voir les réponses',
          confirmButtonColor: '#27ae60',
          timer: nb === 0 ? 2500 : undefined,
          showConfirmButton: true
        });
      },
      error: () => this.showToastMessage('Erreur lors du chargement des réponses', 'error')
    });
  }

  // Group flat responses into one entry per client
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
    const questionnaireTitre = this.questionnaires.find((q: any) => q.id == this.selectedQuestionnaireId)?.titre || 'Questionnaire';
    const nb = entry.nbReponses;
    const clientName = entry.client?.fullName || entry.client?.mail || 'Client';

    Swal.fire({
      title: `📋 ${questionnaireTitre}`,
      html: `<b>${clientName}</b> a soumis <b>${nb} réponse${nb > 1 ? 's' : ''}</b> à ce questionnaire.`,
      icon: 'info',
      confirmButtonText: '👁 Voir les réponses',
      showCancelButton: true,
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#27ae60',
      cancelButtonColor: '#95a5a6',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) return;
      this.selectedClientData = entry.client;
      this.selectedClientReponses = entry.reponses;
      this.showClientReponsesModal = true;
      this.cdr.detectChanges();
    });
  }

  exportReponsesCSV() {
    if (this.reponses.length === 0) { this.showToastMessage('Aucune réponse à exporter', 'error'); return; }
    const titre = this.questionnaires.find((q: any) => q.id == this.selectedQuestionnaireId)?.titre || 'questionnaire';
    const nomFichier = titre.replace(/ /g, '_');
    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;

    // Group by client for a cleaner CSV
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
      lignes += '\r\n'; // blank line between clients
    }

    const blob = new Blob(['\uFEFF' + lignes], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reponses_${nomFichier}_${dateStr}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    this.showToastMessage('Export CSV téléchargé');
  }

  private buildOffreSelectHtml(): string {
    if (!this.offres.length) return '<p style="color:#e74c3c">Aucune offre disponible.</p>';
    let opts = this.offres.map(o =>
      `<option value="${o.id}">${o.title}</option>`
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
    Swal.fire({
      title: `📤 Envoyer une offre à ${client.fullName || 'ce client'}`,
      html: this.buildOffreSelectHtml(),
      showCancelButton: true,
      confirmButtonText: '📧 Envoyer par email',
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
      this.api.envoyerOffre(offreId, [client.id]).subscribe({
        next: () => Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: '📧 Offre envoyée !', showConfirmButton: false, timer: 2500, timerProgressBar: true }),
        error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible d\'envoyer l\'offre.', confirmButtonColor: '#27ae60' })
      });
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
    Swal.fire({
      title: `📢 Envoyer une offre à tous`,
      html: `<p style="margin-bottom:10px;color:#555">Questionnaire : <b>${titre}</b><br>${count} client${count > 1 ? 's' : ''} concerné${count > 1 ? 's' : ''}</p>` + this.buildOffreSelectHtml(),
      showCancelButton: true,
      confirmButtonText: `📧 Envoyer à ${count} client${count > 1 ? 's' : ''}`,
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
      Swal.fire({ title: 'Envoi en cours...', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
      this.api.envoyerOffre(offreId, clientIds).subscribe({
        next: (res: any) => Swal.fire({ icon: 'success', title: 'Envoyé !', html: `L'offre a été envoyée à <b>${res.sent} client${res.sent > 1 ? 's' : ''}</b> par email.`, confirmButtonColor: '#27ae60' }),
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

  // ── Directeur offer catalog management ──────────
  showOffreForm = false;
  offreForm: any = { title: '', description: '' };
  editingOffre: any = null;

  openAddOffre() {
    this.editingOffre = null;
    this.offreForm = { title: '', description: '' };
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

  createaddquestion() {
    if (!this.newquest.titre) return;
    if (this.newquest.type !== 'text' && !this.newquest.options?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Choix manquants', text: 'Les choix sont obligatoires pour une question de type "' + this.newquest.type + '". Séparez-les par des virgules.', confirmButtonColor: '#27ae60' });
      return;
    }
    this.http.post<any>(this.apiUrl + '/questions', this.newquest).subscribe({
      next: (c: any) => {
        this.selectedquestion.push(c);
        this.questions.push(c);
        this.questform.questions.push(c.id);
        this.newquest = { titre: '', type: 'text', options: '', required: false };
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
    this.filtre = { typeContrat: '', anneeMin: null, profession: '' };
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
    const icon = channel === 'sms' ? '💬' : '📧';
    Swal.fire({
      title: `Envoyer à ${client.fullName} ?`,
      html: `${icon} <b>${channel === 'sms' ? 'SMS' : 'Email'}</b> → ${channel === 'sms' ? client.tel : client.mail}`,
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
            title: channel === 'sms' ? '💬 SMS envoyé !' : '📧 Email envoyé !',
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
      confirmButtonText: '📢 Envoyer maintenant',
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
}