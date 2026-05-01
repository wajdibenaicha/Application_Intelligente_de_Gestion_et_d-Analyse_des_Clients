import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-reponses-section',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './reponses-section.component.html'
})
export class ReponsesSectionComponent implements OnChanges {
  @Input() questionnaires: any[] = [];
  @Input() reponses: any[] = [];
  @Input() selectedQuestionnaireId = '';
  @Input() clientsReponses: any[] = [];
  @Input() chartSent = 0;
  @Input() chartRepondu = 0;
  @Output() selectQuestionnaire = new EventEmitter<string>();
  @Output() exportXLS = new EventEmitter<void>();
  @Output() voirRecommandations = new EventEmitter<void>();
  @Output() supprimerTous = new EventEmitter<void>();
  @Output() voirReponsesClient = new EventEmitter<any>();
  @Output() supprimerReponseClient = new EventEmitter<number>();

  private chart: Chart | null = null;
  private platformId = inject(PLATFORM_ID);

  ngOnChanges(changes: SimpleChanges) {
    if (!isPlatformBrowser(this.platformId)) return;
    if ((changes['chartSent'] || changes['chartRepondu']) && this.reponses.length > 0) {
      setTimeout(() => this.renderChart(), 100);
    }
    if (changes['reponses'] && (!this.reponses || this.reponses.length === 0)) {
      if (this.chart) { this.chart.destroy(); this.chart = null; }
    }
  }

  private renderChart() {
    const canvas = document.getElementById('reponsesParQuestionChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Envoyés', 'Ont répondu'],
        datasets: [{
          data: [this.chartSent, this.chartRepondu],
          backgroundColor: ['#1a56db', '#27ae60'],
          borderRadius: 8,
          barThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y ?? 0;
                const pct = this.chartSent > 0 ? Math.round((val / this.chartSent) * 100) : 0;
                return ` ${val} clients (${pct}%)`;
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}
