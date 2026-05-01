import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gestionnaires-section',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './gestionnaires-section.component.html'
})
export class GestionnairesSectionComponent {
  @Input() gestionnaire: any[] = [];
  @Input() questionnaires: any[] = [];
  @Input() totalReponsesCount = 0;
  @Input() offres: any[] = [];

  @Output() openAdd = new EventEmitter<void>();
  @Output() openEdit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<number>();
  @Output() resetPassword = new EventEmitter<number>();
}
