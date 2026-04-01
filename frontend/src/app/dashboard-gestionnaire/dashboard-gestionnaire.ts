import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { WebSocketService } from '../services/websocket.service';  


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

  // Admin-style questionnaire form
  showquestform = false;
  editingquest: any = null;
  questform: any = { titre: '', description: '', questions: [] };
  questions: any[] = [];
  showaddquestion = false;
  newquest: any = { titre: '', type: 'text', options: '' };
  selectedquestion: any[] = [];
  dragoverIndex = -1;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef ,
    private wsService: WebSocketService
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
    this.http.get<any[]>(this.apiUrl + '/questions').subscribe({
      next: (data) => { this.questions = data; },
      error: () => {}
    });

    this.wsService.questionnaires$.subscribe(data => {
  this.questionnaires = data;
});


  
  }

  setSection(section: string) {
    this.activeSection = section;
    this.showCreateForm = false;
    this.showEditForm = false;
    this.showQuestionsView = false;

    if (section === 'reponses') {
      this.reponses = [];
      this.selectedQuestionnaireId = '';
    }
  }

  getSectionTitle() {
    if (this.activeSection === 'home') return 'Tableau de bord';
    if (this.activeSection === 'questionnaires') return 'Mes Questionnaires';
    if (this.activeSection === 'reponses') return 'Réponses des clients';
    if (this.activeSection === 'offres') return 'Recommandations IA';
    return '';
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  getInitials() {
    if (!this.gestionnaire || !this.gestionnaire.fullName) return 'G';

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
    if (!q.statut) {
      q.statut = q.confirmed === true ? 'PUBLIE' : 'BROUILLON';
    }
    if (q.statut === null || q.statut === undefined || q.statut === '') {
      q.statut = 'BROUILLON';
    }
    return q;
  }

  loadQuestionnaires() {
    this.http.get<any[]>(this.apiUrl + '/questionnaires/gestionnaire/' + this.gestionnaire.id).subscribe({
      next: (data) => {
        this.questionnaires = data.map(q => this.mapStatut(q));
        this.totalQuestionnaires = this.questionnaires.length;

        let enAttente = 0;
        let publie = 0;
        for (let i = 0; i < this.questionnaires.length; i++) {
          if (this.questionnaires[i].statut === 'EN_ATTENTE') enAttente++;
          if (this.questionnaires[i].statut === 'PUBLIE') publie++;
        }

        this.pendingCount = enAttente;
        this.publishedCount = publie;
        this.cdr.detectChanges();
      },
      error: () => {
        this.showToastMessage('Erreur lors du chargement des questionnaires', 'error');
      }
    });
  }

  openCreateQuestionnaire() {
    this.editingquest = null;
    this.selectedquestion = [];
    this.questform = { titre: '', description: '', questions: [] };
    this.showquestform = true;
    this.showCreateForm = false;
    this.showEditForm = false;
    this.showQuestionsView = false;
    this.activeSection = 'questionnaires';
  }

  addNewQuestion() {
    this.newQuestionnaire.questions.push({ titre: '', type: 'input', options: '' });
  }

  removeQuestion(index: number) {
    this.newQuestionnaire.questions.splice(index, 1);
  }

  questionNeedsOptions(type: string) {
    return type === 'radio' || type === 'checkbox' || type === 'select';
  }

  saveQuestionnaire() {
    if (!this.newQuestionnaire.titre || this.newQuestionnaire.titre.trim() === '') {
      this.showToastMessage('Veuillez saisir un titre', 'error');
      return;
    }

    if (this.newQuestionnaire.questions.length === 0) {
      this.showToastMessage('Ajoutez au moins une question', 'error');
      return;
    }

    for (let i = 0; i < this.newQuestionnaire.questions.length; i++) {
      if (!this.newQuestionnaire.questions[i].titre || this.newQuestionnaire.questions[i].titre.trim() === '') {
        this.showToastMessage('La question ' + (i + 1) + ' n\'a pas de titre', 'error');
        return;
      }
    }

    this.isLoading = true;

    const questions = this.newQuestionnaire.questions.map((q: any) => ({
      titre: q.titre,
      type: q.type,
      options: q.options ? q.options : ''
    }));

    const payload = {
      titre: this.newQuestionnaire.titre,
      description: this.newQuestionnaire.description,
      gestionnaire: { id: this.gestionnaire.id },
      questions: questions
    };

    this.http.post<any>(this.apiUrl + '/questionnaires', payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.showCreateForm = false;
        this.loadQuestionnaires();
        this.showToastMessage('Questionnaire créé avec succès');
      },
      error: () => {
        this.isLoading = false;
        this.showToastMessage('Erreur lors de la création', 'error');
      }
    });
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
    this.showCreateForm = false;
    this.showEditForm = false;
    this.showQuestionsView = false;
  }

  addQuestionToEdit() {
    this.editingQuestionnaire.questions.push({ titre: '', type: 'input', options: '' });
  }

  removeQuestionEdit(index: number) {
    this.editingQuestionnaire.questions.splice(index, 1);
  }

  updateQuestionnaire() {
    if (!this.editingQuestionnaire.titre || this.editingQuestionnaire.titre.trim() === '') {
      this.showToastMessage('Veuillez saisir un titre', 'error');
      return;
    }

    if (this.editingQuestionnaire.questions.length === 0) {
      this.showToastMessage('Ajoutez au moins une question', 'error');
      return;
    }

    for (let i = 0; i < this.editingQuestionnaire.questions.length; i++) {
      if (!this.editingQuestionnaire.questions[i].titre || this.editingQuestionnaire.questions[i].titre.trim() === '') {
        this.showToastMessage('La question ' + (i + 1) + ' n\'a pas de titre', 'error');
        return;
      }
    }

    this.isLoading = true;

    const questions = this.editingQuestionnaire.questions.map((q: any) => {
      const obj: any = {
        titre: q.titre,
        type: q.type,
        options: q.options ? q.options : ''
      };
      if (q.id) obj.id = q.id;
      return obj;
    });

    const payload = {
      titre: this.editingQuestionnaire.titre,
      description: this.editingQuestionnaire.description,
      questions: questions
    };

    this.http.put<any>(this.apiUrl + '/questionnaires/' + this.editingQuestionnaire.id, payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.showEditForm = false;
        this.loadQuestionnaires();
        this.showToastMessage('Questionnaire mis à jour');
      },
      error: () => {
        this.isLoading = false;
        this.showToastMessage('Erreur lors de la mise à jour', 'error');
      }
    });
  }

  deleteQuestionnaire(id: number) {
    if (!confirm('Supprimer ce questionnaire ?')) return;

    this.http.delete(this.apiUrl + '/questionnaires/' + id).subscribe({
      next: () => {
        this.loadQuestionnaires();
        this.showToastMessage('Questionnaire supprimé');
      },
      error: () => {
        this.showToastMessage('Erreur lors de la suppression', 'error');
      }
    });
  }

  demanderPublication(q: any) {
    if (!confirm('Envoyer "' + q.titre + '" à l\'administrateur pour publication ?')) return;

    this.http.patch<any>(this.apiUrl + '/questionnaires/' + q.id + '/confirm', {}).subscribe({
      next: (updated) => {
        const idx = this.questionnaires.findIndex((item: any) => item.id === q.id);
        if (idx !== -1) {
          this.questionnaires[idx] = this.mapStatut(updated);
        }
        if (this.selectedQuestionnaire && this.selectedQuestionnaire.id === q.id) {
          this.selectedQuestionnaire = this.questionnaires[idx];
        }
        this.loadQuestionnaires();
        this.showToastMessage('Questionnaire envoyé à l\'administrateur');
      },
      error: () => {
        this.showToastMessage('Erreur lors de l\'envoi', 'error');
      }
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
      error: () => {
        this.showToastMessage('Erreur lors de la suppression', 'error');
      }
    });
  }

  cancelForm() {
    this.showCreateForm = false;
    this.showEditForm = false;
    this.showQuestionsView = false;
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

  loadReponses() {
    if (!this.selectedQuestionnaireId) {
      this.reponses = [];
      return;
    }

    this.http.get<any[]>(this.apiUrl + '/reponses/questionnaire/' + this.selectedQuestionnaireId).subscribe({
      next: (data) => {
        this.reponses = data;
        this.totalReponses = data.length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.showToastMessage('Erreur lors du chargement des réponses', 'error');
      }
    });
  }

  exportReponsesCSV() {
    if (this.reponses.length === 0) {
      this.showToastMessage('Aucune réponse à exporter', 'error');
      return;
    }

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
      const email    = r.client?.mail    || '';
      const tel      = r.client?.tel     || '';
      const question = r.question?.titre || '';
      const type     = r.question?.type  || '';
      const reponse  = r.reponse         || '';
      lignes += '"' + email + '";"' + tel + '";"' + question + '";"' + type + '";"' + reponse + '"\r\n';
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
    this.http.put(this.apiUrl + '/offres/' + offre.id + '/accepter', {}).subscribe({
      next: () => {
        offre.statut = 'ACCEPTE';
        this.showToastMessage('Offre acceptée');
      },
      error: () => {
        this.showToastMessage('Erreur', 'error');
      }
    });
  }

  rejeterOffre(offre: any) {
    this.http.put(this.apiUrl + '/offres/' + offre.id + '/rejeter', {}).subscribe({
      next: () => {
        offre.statut = 'REJETE';
        offre.showManualForm = true;
      },
      error: () => {
        this.showToastMessage('Erreur', 'error');
      }
    });
  }

  soumettreOffreManuelle(offre: any) {
    if (!offre.offreManuelle || offre.offreManuelle.trim() === '') {
      this.showToastMessage('Veuillez saisir votre offre', 'error');
      return;
    }

    this.http.put(this.apiUrl + '/offres/' + offre.id + '/manuelle', { offreManuelle: offre.offreManuelle }).subscribe({
      next: () => {
        offre.showManualForm = false;
        this.showToastMessage('Offre personnalisée soumise');
      },
      error: () => {
        this.showToastMessage('Erreur lors de la soumission', 'error');
      }
    });
  }

  isselectedquestion(id: number): boolean {
    for (let i = 0; i < this.questform.questions.length; i++) {
      if (this.questform.questions[i] === id) return true;
    }
    return false;
  }

  changequestion(id: number) {
    let found = false;
    for (let i = 0; i < this.questform.questions.length; i++) {
      if (this.questform.questions[i] === id) { found = true; break; }
    }
    if (found) {
      const newIds = [];
      for (let i = 0; i < this.questform.questions.length; i++) {
        if (this.questform.questions[i] !== id) newIds.push(this.questform.questions[i]);
      }
      this.questform.questions = newIds;
      const newSelected = [];
      for (let i = 0; i < this.selectedquestion.length; i++) {
        if (this.selectedquestion[i].id !== id) newSelected.push(this.selectedquestion[i]);
      }
      this.selectedquestion = newSelected;
    } else {
      this.questform.questions.push(id);
      for (let i = 0; i < this.questions.length; i++) {
        if (this.questions[i].id === id) { this.selectedquestion.push(this.questions[i]); break; }
      }
    }
  }

  removeselectedquestion(id: number) {
    const newIds = [];
    for (let i = 0; i < this.questform.questions.length; i++) {
      if (this.questform.questions[i] !== id) newIds.push(this.questform.questions[i]);
    }
    this.questform.questions = newIds;
    const newSelected = [];
    for (let i = 0; i < this.selectedquestion.length; i++) {
      if (this.selectedquestion[i].id !== id) newSelected.push(this.selectedquestion[i]);
    }
    this.selectedquestion = newSelected;
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

  dragStart(i: number, e: DragEvent) {
    e.dataTransfer?.setData('text/plain', i.toString());
  }

  dragover(i: number, e: DragEvent) {
    e.preventDefault();
    this.dragoverIndex = i;
  }

  drop(toindex: number, e: DragEvent) {
    e.preventDefault();
    const from = parseInt(e.dataTransfer?.getData('text/plain') || '0');
    const item = this.selectedquestion.splice(from, 1)[0];
    this.selectedquestion.splice(toindex, 0, item);
    this.dragoverIndex = -1;
    const newIds = [];
    for (let i = 0; i < this.selectedquestion.length; i++) {
      newIds.push(this.selectedquestion[i].id);
    }
    this.questform.questions = newIds;
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
        error: () => { this.showToastMessage('Erreur lors de la mise à jour', 'error'); }
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
        error: () => { this.showToastMessage('Erreur lors de la création', 'error'); }
      });
    }
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