import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-permission-form-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-form-modal.component.html'
})
export class PermissionFormModalComponent implements OnChanges {
  @Input() permissionToEdit: any = null;
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  form: any = { description: '' };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['permissionToEdit']) {
      this.form = { description: this.permissionToEdit?.description || '' };
    }
  }
}
