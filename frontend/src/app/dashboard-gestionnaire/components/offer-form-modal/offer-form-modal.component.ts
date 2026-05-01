import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Api } from '../../../services/api';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-offer-form-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './offer-form-modal.component.html'
})
export class OfferFormModalComponent implements OnChanges {
  @Input() offreToEdit: any = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  offreForm: any = { title: '', description: '', categorie: 'GENERAL' };
  offreIaResult: any = null;
  offreIaLoading = false;
  offreIaChecking = false;
  offreIaWarning: string | null = null;
  offreIaSuggestion: any = null;
  private offreCoherenceTimer: any = null;
  private readonly apiUrl = 'http://localhost:8081/api';

  constructor(private http: HttpClient, private api: Api, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['offreToEdit']) {
      this.offreIaResult = null;
      this.offreIaWarning = null;
      this.offreIaSuggestion = null;
      this.offreIaChecking = false;
      clearTimeout(this.offreCoherenceTimer);
      if (this.offreToEdit) {
        this.offreForm = {
          title: this.offreToEdit.title,
          description: this.offreToEdit.description,
          categorie: this.offreToEdit.categorie || 'GENERAL',
          scoreMin: this.offreToEdit.scoreMin ?? 0,
          scoreMax: this.offreToEdit.scoreMax ?? 100,
          active: this.offreToEdit.active !== false
        };
      } else {
        this.offreForm = { title: '', description: '', categorie: 'GENERAL' };
      }
    }
  }

  scheduleOffreCoherenceCheck() {
    if (this.offreToEdit) return;
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

  saveOffre() {
    if (!this.offreForm.title?.trim() || !this.offreForm.description?.trim()) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Titre et description sont obligatoires', showConfirmButton: false, timer: 2500 });
      return;
    }
    if (this.offreToEdit) {
      const payload = { ...this.offreForm, active: true };
      this.api.updateoffre(this.offreToEdit.id, payload).subscribe({
        next: () => { this.saved.emit(); },
        error: () => Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Erreur lors de la modification', showConfirmButton: false, timer: 2500 })
      });
      return;
    }
    if (this.offreIaResult) {
      const payload = { ...this.offreForm, scoreMin: this.offreIaResult.scoreMin ?? 0, scoreMax: this.offreIaResult.scoreMax ?? 100, active: true };
      this.api.addoffre(payload).subscribe({
        next: () => { this.saved.emit(); },
        error: () => Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Erreur lors de l\'ajout', showConfirmButton: false, timer: 2500 })
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
        const payload = { ...this.offreForm, scoreMin: res.scoreMin ?? 0, scoreMax: res.scoreMax ?? 100, active: true };
        this.api.addoffre(payload).subscribe({
          next: () => { this.saved.emit(); },
          error: () => Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Erreur lors de l\'ajout', showConfirmButton: false, timer: 2500 })
        });
      },
      error: () => {
        this.offreIaLoading = false;
        this.cdr.detectChanges();
        const payload = { ...this.offreForm, scoreMin: 0, scoreMax: 100, active: true };
        this.api.addoffre(payload).subscribe({
          next: () => { this.saved.emit(); },
          error: () => Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Erreur lors de l\'ajout', showConfirmButton: false, timer: 2500 })
        });
      }
    });
  }
}
