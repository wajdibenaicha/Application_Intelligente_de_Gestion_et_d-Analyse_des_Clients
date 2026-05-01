import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-offre-edit-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './offre-edit-modal.component.html'
})
export class OffreEditModalComponent implements OnChanges {
  @Input() offreToEdit: any = null;
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  form: any = { title: '', description: '', categorie: 'GENERAL' };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['offreToEdit'] && this.offreToEdit) {
      this.form = {
        title: this.offreToEdit.title,
        description: this.offreToEdit.description,
        categorie: this.offreToEdit.categorie || 'GENERAL'
      };
    }
  }
}
