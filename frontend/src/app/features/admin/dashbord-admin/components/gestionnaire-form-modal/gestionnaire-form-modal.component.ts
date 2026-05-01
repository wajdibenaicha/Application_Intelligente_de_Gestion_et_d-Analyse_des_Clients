import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-gestionnaire-form-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestionnaire-form-modal.component.html'
})
export class GestionnaireFormModalComponent implements OnChanges {
  @Input() gestToEdit: any = null;
  @Input() roles: any[] = [];
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  form: any = { fullName: '', email: '', password: '', role: null };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['gestToEdit']) {
      if (this.gestToEdit) {
        this.form = { fullName: this.gestToEdit.fullName, email: this.gestToEdit.email, password: '', role: this.gestToEdit.role };
      } else {
        this.form = { fullName: '', email: '', password: '', role: null };
      }
    }
  }

  get canSave(): boolean {
    return !!(this.form.fullName && this.form.email && (this.gestToEdit || this.form.password));
  }
}
