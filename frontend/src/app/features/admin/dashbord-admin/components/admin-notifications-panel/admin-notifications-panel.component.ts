import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-notifications-panel',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './admin-notifications-panel.component.html'
})
export class AdminNotificationsPanelComponent {
  @Input() notifications: any[] = [];
  @Output() closed = new EventEmitter<void>();
}
