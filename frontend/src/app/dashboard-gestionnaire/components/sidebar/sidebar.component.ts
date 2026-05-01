import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Input() activeSection = 'home';
  @Input() gestionnaire: any = null;
  @Input() canManageAll = false;

  @Output() toggle = new EventEmitter<void>();
  @Output() sectionChange = new EventEmitter<string>();
  @Output() logoutEvent = new EventEmitter<void>();

  getInitials(): string {
    if (!this.gestionnaire?.fullName) return 'G';
    const parts = this.gestionnaire.fullName.split(' ');
    let initials = '';
    for (const p of parts) {
      if (p.length > 0) initials += p[0].toUpperCase();
      if (initials.length === 2) break;
    }
    return initials;
  }
}
