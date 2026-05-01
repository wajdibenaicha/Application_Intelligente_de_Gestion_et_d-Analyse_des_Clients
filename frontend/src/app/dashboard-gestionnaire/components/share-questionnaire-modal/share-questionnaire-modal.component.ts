import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-share-questionnaire-modal',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './share-questionnaire-modal.component.html'
})
export class ShareQuestionnaireModalComponent {
  @Input() questionnaire: any = null;
  @Input() clientsFiltres: any[] = [];
  @Input() typeContrats: string[] = [];
  @Input() annees: number[] = [];
  @Input() professions: string[] = [];
  @Input() filtre: any = { typeContrat: '', anneeMin: null, profession: '', primeRange: '' };
  @Input() clientsAyantRepondu: Set<number> = new Set();
  @Output() closed = new EventEmitter<void>();
  @Output() filtreChange = new EventEmitter<void>();
  @Output() envoyerDirectement = new EventEmitter<{ client: any; channel: string }>();
  @Output() envoyerATous = new EventEmitter<void>();
}
