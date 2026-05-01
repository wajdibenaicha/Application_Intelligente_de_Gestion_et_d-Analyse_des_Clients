import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-delegate-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './delegate-modal.component.html'
})
export class DelegateModalComponent {
  @Input() myTeams: any[] = [];
  @Input() delegateform: any = { gestionnaireId: null, titreHint: '' };
  @Output() closed = new EventEmitter<void>();
  @Output() send = new EventEmitter<void>();
}
