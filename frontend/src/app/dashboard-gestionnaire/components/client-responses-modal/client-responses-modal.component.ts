import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-client-responses-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './client-responses-modal.component.html'
})
export class ClientResponsesModalComponent {
  @Input() clientData: any = null;
  @Input() reponses: any[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() envoyerOffre = new EventEmitter<any>();
}
