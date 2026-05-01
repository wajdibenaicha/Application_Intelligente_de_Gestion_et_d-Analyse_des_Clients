import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-client-responses-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './admin-client-responses-modal.component.html'
})
export class AdminClientResponsesModalComponent {
  @Input() clientData: any = null;
  @Input() reponses: any[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() deleteReponse = new EventEmitter<number>();
}
