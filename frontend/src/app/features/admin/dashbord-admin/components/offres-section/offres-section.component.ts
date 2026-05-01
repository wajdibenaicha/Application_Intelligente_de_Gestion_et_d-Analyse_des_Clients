import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-offres-section',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './offres-section.component.html'
})
export class AdminOffresSectionComponent {
  @Input() offres: any[] = [];
  @Input() gestionnaire: any[] = [];
  @Input() questionnaires: any[] = [];
  @Input() totalReponsesCount = 0;

  @Output() editOffre = new EventEmitter<any>();
  @Output() deleteOffre = new EventEmitter<number>();
}
