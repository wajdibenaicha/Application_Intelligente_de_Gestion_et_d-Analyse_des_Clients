import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './admin-sidebar.component.html'
})
export class AdminSidebarComponent {
  @Input() collapsed = false;
  @Input() activeTab = 'home';

  @Output() toggle = new EventEmitter<void>();
  @Output() tabChange = new EventEmitter<string>();
  @Output() logoutEvent = new EventEmitter<void>();
}
