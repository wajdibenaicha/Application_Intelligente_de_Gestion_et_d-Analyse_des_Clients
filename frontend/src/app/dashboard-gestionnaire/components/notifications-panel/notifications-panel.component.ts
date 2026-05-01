import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './notifications-panel.component.html'
})
export class NotificationsPanelComponent {
  @Input() notifications: any[] = [];
  @Output() closed = new EventEmitter<void>();
}
