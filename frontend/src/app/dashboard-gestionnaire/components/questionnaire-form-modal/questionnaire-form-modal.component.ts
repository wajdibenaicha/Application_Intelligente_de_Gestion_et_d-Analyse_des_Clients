import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-questionnaire-form-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './questionnaire-form-modal.component.html'
})
export class QuestionnaireFormModalComponent implements OnChanges {
  @Input() questToEdit: any = null;
  @Input() questions: any[] = [];
  @Input() questionnaires: any[] = [];
  @Input() gestionnaire: any = null;
  @Input() canManageAll = false;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  availableQuestions: any[] = [];
  questform: any = { titre: '', description: '', questions: [] };
  selectedquestion: any[] = [];
  editingquest: any = null;
  showaddquestion = false;
  newquest: any = { titre: '', type: 'text', options: '', required: false };
  questionSearchText = '';
  editingOptionsId: number | null = null;
  dragoverIndex = -1;

  iaAutoSuggestion: any = null;
  iaDoublonWarning: any = null;
  iaCoherenceWarning: any = null;
  iaTypeWarning: any = null;
  iaEnsembleWarning: any = null;
  iaOptionsSuggestion: string[] = [];
  iaLoading = false;
  iaReordering = false;
  iaQuestDoublonWarning: any = null;

  private iaDebounceTimer: any = null;
  private iaEnsembleTimer: any = null;
  private iaReorderTimer: any = null;
  private iaActiveCalls = 0;
  private readonly apiUrl = 'http://localhost:8081/api';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['questions']) {
      this.availableQuestions = [...(this.questions || [])];
    }
    if (changes['questToEdit']) {
      this.initForm();
    }
  }

  private initForm() {
    clearTimeout(this.iaReorderTimer);
    this.iaAutoSuggestion = null;
    this.iaDoublonWarning = null;
    this.iaEnsembleWarning = null;
    this.iaQuestDoublonWarning = null;
    this.iaOptionsSuggestion = [];
    this.questionSearchText = '';
    this.showaddquestion = false;
    this.newquest = { titre: '', type: 'text', options: '', required: false };
    if (this.questToEdit) {
      this.editingquest = this.questToEdit;
      this.questform = {
        titre: this.questToEdit.titre,
        description: this.questToEdit.description,
        questions: this.questToEdit.questions ? this.questToEdit.questions.map((item: any) => item.id) : []
      };
      this.selectedquestion = this.questToEdit.questions ? [...this.questToEdit.questions] : [];
    } else {
      this.editingquest = null;
      this.questform = { titre: '', description: '', questions: [] };
      this.selectedquestion = [];
    }
  }

  get filteredQuestions(): any[] {
    const term = this.questionSearchText.trim().toLowerCase();
    if (!term) return this.availableQuestions;
    return this.availableQuestions.filter(q => (q.titre || q.title || '').toLowerCase().includes(term));
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

  get currentTextPct(): number {
    const total = this.selectedquestion.length;
    if (total === 0) return 0;
    return Math.round((this.selectedquestion.filter((q: any) => q.type === 'text').length / total) * 100);
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      text: 'Texte libre', radio: 'Choix unique',
      checkbox: 'Choix multiple', scale: 'Échelle', select: 'Liste déroulante'
    };
    return labels[type] || type;
  }

  getOptionsArray(options: string): string[] {
    if (!options || !options.trim()) return [];
    return options.split(',').map(o => o.trim()).filter(o => o !== '');
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
      const q = this.availableQuestions.find(q => q.id === id);
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

  toggleOptionsEdit(id: number) {
    this.editingOptionsId = this.editingOptionsId === id ? null : id;
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
      ...this.availableQuestions.map((q: any) => q.titre || q.title),
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
      const overlap = common / union;
      if (overlap > maxOverlap) { maxOverlap = overlap; worstMatch = existing; }
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

  scheduleReorder() {
    clearTimeout(this.iaReorderTimer);
    if (this.selectedquestion.length < 2) return;
    this.iaReorderTimer = setTimeout(() => {
      if (this.iaActiveCalls > 0) { this.scheduleReorder(); return; }
      this.reorderSelectedQuestions();
    }, 1500);
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

  acceptAutoSuggestion() {
    this.newquest = { ...this.newquest, titre: this.iaAutoSuggestion.titreReformule };
    this.iaAutoSuggestion = null;
    this.iaDoublonWarning = null;
    this.iaOptionsSuggestion = [];
    this.cdr.detectChanges();
  }

  acceptOptionsSuggestion() {
    this.newquest.options = this.iaOptionsSuggestion.join(', ');
    this.iaOptionsSuggestion = [];
    this.cdr.detectChanges();
  }

  createaddquestion() {
    if (!this.newquest.titre?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Titre manquant', text: 'Veuillez saisir le texte de la question.', confirmButtonColor: '#e67e22' });
      return;
    }
    if (this.iaDoublonWarning) {
      Swal.fire({ icon: 'warning', title: 'Doublon sémantique détecté', text: 'Cette question couvre déjà un sujet existant. Modifiez-la ou ignorez l\'avertissement.', confirmButtonColor: '#e67e22' });
      return;
    }
    if (this.newquest.type !== 'text' && !this.newquest.options?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Choix manquants', text: 'Les choix sont obligatoires pour ce type de question.', confirmButtonColor: '#e67e22' });
      return;
    }
    if (this.newquest.type === 'scale' && !this.hasNeutralOption(this.newquest.options)) {
      Swal.fire({ icon: 'warning', title: 'Option neutre manquante', text: 'Une échelle doit contenir une option neutre centrale (ex: "Parfois").', confirmButtonColor: '#e67e22' });
      return;
    }
    this.http.post<any>(this.apiUrl + '/questions', this.newquest).subscribe({
      next: (c: any) => {
        this.selectedquestion.push(c);
        this.availableQuestions.push(c);
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

  savequestionnaire() {
    this.questform.questions = this.selectedquestion;
    if (this.editingquest) {
      const isDirecteur = this.canManageAll;
      const wasNotBrouillon = this.editingquest.statut !== 'BROUILLON';
      const payload: any = {
        titre: this.questform.titre,
        description: this.questform.description,
        questions: this.selectedquestion
      };
      if (wasNotBrouillon && !isDirecteur) payload.statut = 'BROUILLON';
      this.http.put<any>(this.apiUrl + '/questionnaires/' + this.editingquest.id, payload).subscribe({
        next: () => { this.saved.emit(); },
        error: () => Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Erreur lors de la mise à jour', showConfirmButton: false, timer: 2500 })
      });
    }
  }

  saveCreateQuestionnaire() {
    if (!this.questform.titre) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Donnez un titre au questionnaire', showConfirmButton: false, timer: 2500 });
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
      next: () => { this.saved.emit(); },
      error: () => Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Erreur lors de la création', showConfirmButton: false, timer: 2500 })
    });
  }

  private hasNeutralOption(options: string): boolean {
    const neutralWords = ['parfois', 'neutre', 'moyen', 'modéré', 'modere', 'neither', 'sometimes'];
    const opts = (options || '').toLowerCase();
    const parts = opts.split(',').map(o => o.trim()).filter(o => o !== '');
    const isNumericScale = parts.length >= 2 && parts.every(o => !isNaN(Number(o)));
    return isNumericScale || neutralWords.some(w => opts.includes(w));
  }

  private textQuestionPct(): number {
    const total = this.selectedquestion.length + 1;
    const textCount = this.selectedquestion.filter((q: any) => q.type === 'text').length
      + (this.newquest.type === 'text' ? 1 : 0);
    return textCount / total;
  }
}
