import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-teams-section',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './teams-section.component.html'
})
export class AdminTeamsSectionComponent {
  @Input() teams: any[] = [];
  @Input() gestionnaire: any[] = [];
  @Input() questionnaires: any[] = [];
  @Input() totalReponsesCount = 0;
  @Input() offres: any[] = [];

  @Output() openAdd = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();
  @Output() openMembers = new EventEmitter<any>();
}
