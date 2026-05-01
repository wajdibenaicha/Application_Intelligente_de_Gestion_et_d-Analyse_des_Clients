import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-teams-section',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './teams-section.component.html'
})
export class TeamsSectionComponent {
  @Input() myTeams: any[] = [];
  @Input() questionnaires: any[] = [];
  @Input() allTeamMembers: any[] = [];
  @Output() openDelegate = new EventEmitter<void>();

  questionnairesForTeam(team: any): any[] {
    const memberIds = new Set((team.members || []).map((m: any) => m.id));
    return this.questionnaires.filter(q => memberIds.has(q.gestionnaire?.id));
  }
}
