import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-team-members-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './team-members-modal.component.html'
})
export class TeamMembersModalComponent {
  @Input() team: any = null;
  @Input() availableGestionnaires: any[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() addMember = new EventEmitter<number>();
  @Output() removeMember = new EventEmitter<number>();
  @Output() changeDirecteur = new EventEmitter<void>();
}
