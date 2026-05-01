import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topbar',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './topbar.component.html'
})
export class TopbarComponent {
  @Input() activeSection = 'home';
  @Input() unreadNotifCount = 0;
  @Input() today = new Date();
  @Output() notifToggled = new EventEmitter<void>();

  getSectionTitle(): string {
    if (this.activeSection === 'home') return 'Tableau de bord';
    if (this.activeSection === 'questionnaires') return 'Questionnaires';
    if (this.activeSection === 'reponses') return 'Réponses des clients';
    if (this.activeSection === 'offres') return 'Offres';
    if (this.activeSection === 'teams') return 'Mes Équipes';
    return '';
  }
}
