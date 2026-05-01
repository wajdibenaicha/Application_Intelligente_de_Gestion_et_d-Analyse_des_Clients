import { Component, Input, Output, EventEmitter, AfterViewInit, OnChanges, SimpleChanges, inject, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './dashboard-home.component.html'
})
export class DashboardHomeComponent implements AfterViewInit, OnChanges {
  @Input() totalQuestionnaires = 0;
  @Input() pendingCount = 0;
  @Input() publishedCount = 0;
  @Input() totalReponses = 0;
  @Input() recommendations: any[] = [];
  @Input() questionnaires: any[] = [];
  @Input() allReponses: any[] = [];
  @Input() canManageAll = false;
  @Input() gestionnaire: any = null;
  @Output() openWizard = new EventEmitter<void>();
  @Output() navigateTo = new EventEmitter<string>();

  private sentimentChart: Chart | null = null;
  private scoreChart: Chart | null = null;
  private statutChart: Chart | null = null;
  private reponsesChart: Chart | null = null;
  private platformId = inject(PLATFORM_ID);

  get hasSentimentData(): boolean {
    return this.recommendations.some(r => r.clientKpi?.sentiment);
  }

  get hasScoreData(): boolean {
    return this.recommendations.some(r => r.clientKpi?.score != null);
  }

  get hasStatutData(): boolean {
    return this.questionnaires.length > 0;
  }

  get hasReponsesData(): boolean {
    return this.allReponses.length > 0;
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => this.renderAllCharts(), 150);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!isPlatformBrowser(this.platformId)) return;
    if (changes['recommendations'] || changes['questionnaires'] || changes['allReponses']) {
      setTimeout(() => this.renderAllCharts(), 150);
    }
  }

  private renderAllCharts() {
    this.renderSentimentChart();
    this.renderScoreChart();
    this.renderStatutChart();
    this.renderReponsesChart();
  }

  private renderSentimentChart() {
    const sentMap: any = { VERY_POSITIVE: 0, POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, VERY_NEGATIVE: 0 };
    for (const r of this.recommendations) {
      const s = r.clientKpi?.sentiment;
      if (s && sentMap[s] !== undefined) sentMap[s]++;
    }
    const canvas = document.getElementById('sentimentChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.sentimentChart) { this.sentimentChart.destroy(); this.sentimentChart = null; }
    this.sentimentChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Très positif', 'Positif', 'Neutre', 'Négatif', 'Très négatif'],
        datasets: [{
          data: [sentMap.VERY_POSITIVE, sentMap.POSITIVE, sentMap.NEUTRAL, sentMap.NEGATIVE, sentMap.VERY_NEGATIVE],
          backgroundColor: ['#1abc9c', '#2ecc71', '#f39c12', '#e67e22', '#e74c3c'],
          borderWidth: 2
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '60%' }
    });
  }

  private renderScoreChart() {
    const labels = this.recommendations.filter((r: any) => r.clientKpi?.score != null).map((r: any) => r.clientKpi?.client?.fullName || 'Client');
    const scores = this.recommendations.filter((r: any) => r.clientKpi?.score != null).map((r: any) => r.clientKpi.score);
    const canvas = document.getElementById('scoreChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.scoreChart) { this.scoreChart.destroy(); this.scoreChart = null; }
    this.scoreChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Score',
          data: scores,
          backgroundColor: scores.map(s => s >= 70 ? '#27ae60' : s >= 40 ? '#f39c12' : '#e74c3c'),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100, ticks: { stepSize: 20 } },
          x: { ticks: { font: { size: 11 } } }
        }
      }
    });
  }

  private renderStatutChart() {
    const visible = this.canManageAll
      ? this.questionnaires
      : this.questionnaires.filter(q => q.gestionnaire?.id === this.gestionnaire?.id);
    const brouillon = visible.filter(q => (q.statut || '').toUpperCase() === 'BROUILLON').length;
    const enAttente = visible.filter(q => (q.statut || '').toUpperCase() === 'EN_ATTENTE').length;
    const approuve  = visible.filter(q => ['PUBLIE', 'APPROUVE'].includes((q.statut || '').toUpperCase())).length;
    const rejete    = visible.filter(q => (q.statut || '').toUpperCase() === 'REJETE').length;
    const canvas = document.getElementById('statutChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.statutChart) { this.statutChart.destroy(); this.statutChart = null; }
    this.statutChart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['Brouillon', 'En attente', 'Approuvé', 'Rejeté'],
        datasets: [{
          data: [brouillon, enAttente, approuve, rejete],
          backgroundColor: ['#95a5a6', '#f39c12', '#27ae60', '#e74c3c']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  private renderReponsesChart() {
    const visibleIds = new Set(
      (this.canManageAll
        ? this.questionnaires
        : this.questionnaires.filter((q: any) => q.gestionnaire?.id === this.gestionnaire?.id)
      ).map((q: any) => q.id)
    );
    const map = new Map<string, Set<number>>();
    for (const r of this.allReponses) {
      const qId = r.questionnaire?.id;
      const qTitre = r.questionnaire?.titre || 'Questionnaire ' + qId;
      const clientId = r.client?.id;
      if (!qId || !clientId || !visibleIds.has(qId)) continue;
      if (!map.has(qTitre)) map.set(qTitre, new Set());
      map.get(qTitre)!.add(clientId);
    }
    const labels = Array.from(map.keys());
    const counts = Array.from(map.values()).map(set => set.size);
    const canvas = document.getElementById('reponsesChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.reponsesChart) { this.reponsesChart.destroy(); this.reponsesChart = null; }
    this.reponsesChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Clients ayant répondu',
          data: counts,
          backgroundColor: '#3498db',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 } },
          y: { ticks: { font: { size: 11 } } }
        }
      }
    });
  }
}
