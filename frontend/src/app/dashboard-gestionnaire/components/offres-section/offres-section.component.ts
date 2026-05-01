import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-offres-section',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './offres-section.component.html'
})
export class OffresSectionComponent {
  @Input() offres: any[] = [];
  @Input() canManageAll = false;
  @Output() addOffre = new EventEmitter<void>();
  @Output() editOffre = new EventEmitter<any>();
  @Output() deleteOffre = new EventEmitter<any>();
}
