import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-role-form-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-form-modal.component.html'
})
export class RoleFormModalComponent implements OnChanges {
  @Input() roleToEdit: any = null;
  @Input() permissions: any[] = [];
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  form: any = { name: '', permission: null };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['roleToEdit']) {
      this.form = this.roleToEdit
        ? { name: this.roleToEdit.name, permission: this.roleToEdit.permission }
        : { name: '', permission: null };
    }
  }
}
