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
      if (parts[i].length > 0) {
        initials += parts[i][0].toUpperCase();
      }
      if (initials.length === 2) break;
    }

    return initials;
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.clear();
    }
    this.router.navigate(['/login']);
  }

  loadQuestionnaires() {
    this.http.get<any[]>(this.apiUrl + '/questionnaires/gestionnaire/' + this.gestionnaire.id).subscribe({
      next: (data) => {
        this.questionnaires = data;
        this.totalQuestionnaires = data.length;

        let enAttente = 0;
        let publie = 0;
        for (let i = 0; i < data.length; i++) {
          if (data[i].statut === 'EN_ATTENTE') enAttente++;
          if (data[i].statut === 'PUBLIE') publie++;
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
    this.newQuestionnaire = { titre: '', description: '', questions: [] };
    this.showCreateForm = true;
    this.showEditForm = false;
    this.showQuestionsView = false;
    this.activeSection = 'questionnaires';
  }

  addNewQuestion() {
    const question = { titre: '', type: 'input', options: '' };
    this.newQuestionnaire.questions.push(question);
  }

  removeQuestion(index: number) {
    this.newQuestionnaire.questions.splice(index, 1);
  }

  questionNeedsOptions(type: string) {
    if (type === 'radio') return true;
    if (type === 'checkbox') return true;
    if (type === 'select') return true;
    return false;
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
      const q = this.newQuestionnaire.questions[i];
      if (!q.titre || q.titre.trim() === '') {
        this.showToastMessage('La question ' + (i + 1) + ' n\'a pas de titre', 'error');
        return;
      }
    }

    this.isLoading = true;

    const questions = [];
    for (let i = 0; i < this.newQuestionnaire.questions.length; i++) {
      const q = this.newQuestionnaire.questions[i];
      questions.push({
        titre: q.titre,
        type: q.type,
        options: q.options ? q.options : ''
      });
    }

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
        this.showToastMessage('Questionnaire créé et sauvegardé');
      },
      error: () => {
        this.isLoading = false;
        this.showToastMessage('Erreur lors de la création', 'error');
      }
    });
  }

  editQuestionnaire(q: any) {
    const questions = [];
    if (q.questions) {
      for (let i = 0; i < q.questions.length; i++) {
        questions.push({
          id: q.questions[i].id,
          titre: q.questions[i].titre,
          type: q.questions[i].type,
          options: q.questions[i].options ? q.questions[i].options : ''
        });
      }
    }

    this.editingQuestionnaire = {
      id: q.id,
      titre: q.titre,
      description: q.description,
      statut: q.statut,
      questions: questions
    };

    this.showEditForm = true;
    this.showCreateForm = false;
    this.showQuestionsView = false;
  }

  addQuestionToEdit() {
    const question = { titre: '', type: 'input', options: '' };
    this.editingQuestionnaire.questions.push(question);
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
      const q = this.editingQuestionnaire.questions[i];
      if (!q.titre || q.titre.trim() === '') {
        this.showToastMessage('La question ' + (i + 1) + ' n\'a pas de titre', 'error');
        return;
      }
    }

    this.isLoading = true;

    const questions = [];
    for (let i = 0; i < this.editingQuestionnaire.questions.length; i++) {
      const q = this.editingQuestionnaire.questions[i];
      const obj: any = {
        titre: q.titre,
        type: q.type,
        options: q.options ? q.options : ''
      };
      if (q.id) {
        obj.id = q.id;
      }
      questions.push(obj);
    }

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
    const confirmation = confirm('Supprimer ce questionnaire ?');
    if (!confirmation) return;

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
    const confirmation = confirm('Envoyer "' + q.titre + '" à l\'administrateur pour publication ?');
    if (!confirmation) return;

    this.http.put(this.apiUrl + '/questionnaires/' + q.id + '/demander-publication', {}).subscribe({
      next: () => {
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
    const confirmation = confirm('Supprimer cette question ?');
    if (!confirmation) return;

    this.http.delete(this.apiUrl + '/questions/' + questionId).subscribe({
      next: () => {
        const newList = [];
        for (let i = 0; i < questionnaire.questions.length; i++) {
          if (questionnaire.questions[i].id !== questionId) {
            newList.push(questionnaire.questions[i]);
          }
        }
        questionnaire.questions = newList;

        this.selectedQuestionnaire = { ...questionnaire };

        const newQuestionnaires = [];
        for (let i = 0; i < this.questionnaires.length; i++) {
          if (this.questionnaires[i].id === questionnaire.id) {
            newQuestionnaires.push({ ...questionnaire });
          } else {
            newQuestionnaires.push(this.questionnaires[i]);
          }
        }
        this.questionnaires = newQuestionnaires;
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
        nomFichier = this.questionnaires[i].titre;
        break;
      }
    }

    nomFichier = nomFichier.replace(/ /g, '_');

    const date = new Date();
    const jour = date.getDate() < 10 ? '0' + date.getDate() : '' + date.getDate();
    const mois = (date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : '' + (date.getMonth() + 1);
    const annee = date.getFullYear();

    let lignes = 'Email client;Téléphone;Question;Type de question;Réponse\r\n';

    for (let i = 0; i < this.reponses.length; i++) {
      const r = this.reponses[i];

      const email = r.client && r.client.mail ? r.client.mail : '';
      const tel = r.client && r.client.tel ? r.client.tel : '';
      const question = r.question && r.question.titre ? r.question.titre : '';
      const type = r.question && r.question.type ? r.question.type : '';
      const reponse = r.reponse ? r.reponse : '';

      lignes += '"' + email + '";"' + tel + '";"' + question + '";"' + type + '";"' + reponse + '"\r\n';
    }

    const bom = '\uFEFF';
    const blob = new Blob([bom + lignes], { type: 'text/csv;charset=utf-8;' });
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
        const liste = [];
        for (let i = 0; i < data.length; i++) {
          const offre = data[i];
          offre.showManualForm = false;
          if (!offre.offreManuelle) offre.offreManuelle = '';
          liste.push(offre);
        }
        this.offresIA = liste;
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

    const body = { offreManuelle: offre.offreManuelle };

    this.http.put(this.apiUrl + '/offres/' + offre.id + '/manuelle', body).subscribe({
      next: () => {
        offre.showManualForm = false;
        this.showToastMessage('Offre personnalisée soumise');
      },
      error: () => {
        this.showToastMessage('Erreur lors de la soumission', 'error');
      }
    });
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