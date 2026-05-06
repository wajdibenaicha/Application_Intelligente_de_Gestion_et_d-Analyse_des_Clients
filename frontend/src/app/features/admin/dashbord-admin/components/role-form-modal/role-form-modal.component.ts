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

  form: any = { name: '', permissions: [] };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['roleToEdit']) {
      this.form = this.roleToEdit
        ? { name: this.roleToEdit.name, permissions: [...(this.roleToEdit.permissions || [])] }
        : { name: '', permissions: [] };
    }
  }

  isSelected(p: any): boolean {
    return this.form.permissions.some((perm: any) => perm.id === p.id);
  }

  toggle(p: any) {
    const idx = this.form.permissions.findIndex((perm: any) => perm.id === p.id);
    if (idx >= 0) {
      this.form.permissions.splice(idx, 1);
    } else {
      this.form.permissions.push(p);
    }
  }
}
