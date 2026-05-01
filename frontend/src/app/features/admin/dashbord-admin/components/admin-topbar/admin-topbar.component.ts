import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './admin-topbar.component.html'
})
export class AdminTopbarComponent {
  @Input() activeTab = 'home';
  @Input() unreadNotifCount = 0;
  @Input() today: Date = new Date();

  @Output() notifToggled = new EventEmitter<void>();
}
