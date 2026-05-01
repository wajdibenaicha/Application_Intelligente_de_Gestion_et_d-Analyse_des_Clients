import { Component, Input, Output, EventEmitter, AfterViewInit, OnChanges, SimpleChanges, inject, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './admin-home.component.html'
})
export class AdminHomeComponent implements AfterViewInit, OnChanges {
  @Input() displayGestCount = 0;
  @Input() displayQuestCount = 0;
  @Input() displayRepCount = 0;
  @Input() displayOffresCount = 0;
  @Input() displayTeamsCount = 0;
  @Input() questionnaires: any[] = [];
  @Input() responses: any[] = [];
  @Input() gestionnaire: any[] = [];
  @Input() offres: any[] = [];

  @Output() navigateTo = new EventEmitter<string>();
  @Output() openAddGestionnaire = new EventEmitter<void>();

  private statutChart: Chart | null = null;
  private reponsesChart: Chart | null = null;
  private rolesChart: Chart | null = null;
  private offresChart: Chart | null = null;
  private platformId = inject(PLATFORM_ID);

  get hasStatutData(): boolean { return this.questionnaires.length > 0; }
  get hasReponsesData(): boolean { return this.responses.length > 0; }
  get hasRolesData(): boolean { return this.gestionnaire.length > 0; }
  get hasOffresData(): boolean { return this.offres.length > 0; }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => this.renderAllCharts(), 200);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!isPlatformBrowser(this.platformId)) return;
    if (changes['questionnaires'] || changes['responses'] || changes['gestionnaire'] || changes['offres']) {
      setTimeout(() => this.renderAllCharts(), 200);
    }
  }

  private renderAllCharts() {
    this.renderStatutChart();
    this.renderReponsesChart();
    this.renderRolesChart();
    this.renderOffresChart();
  }

  private renderStatutChart() {
    const canvas = document.getElementById('adminStatutChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.statutChart) { this.statutChart.destroy(); this.statutChart = null; }
    const counts = {
      brouillon: this.questionnaires.filter(q => (q.statut||'').toUpperCase() === 'BROUILLON').length,
      enAttente: this.questionnaires.filter(q => (q.statut||'').toUpperCase() === 'EN_ATTENTE').length,
      approuve:  this.questionnaires.filter(q => q.confirmed || ['PUBLIE','APPROUVE'].includes((q.statut||'').toUpperCase())).length,
      rejete:    this.questionnaires.filter(q => (q.statut||'').toUpperCase() === 'REJETE').length,
    };
    this.statutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Brouillon', 'En attente', 'Approuvé', 'Rejeté'],
        datasets: [{ data: [counts.brouillon, counts.enAttente, counts.approuve, counts.rejete],
          backgroundColor: ['#95a5a6', '#f39c12', '#27ae60', '#e74c3c'], borderWidth: 2 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '60%' }
    });
  }

  private renderReponsesChart() {
    const canvas = document.getElementById('adminReponsesChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.reponsesChart) { this.reponsesChart.destroy(); this.reponsesChart = null; }
    const map = new Map<string, Set<number>>();
    for (const r of this.responses) {
      const qId = r.questionnaire?.id;
      const titre = r.questionnaire?.titre || ('Q' + qId);
      const cId = r.client?.id;
      if (!qId || !cId) continue;
      if (!map.has(titre)) map.set(titre, new Set());
      map.get(titre)!.add(cId);
    }
    const labels = Array.from(map.keys());
    const counts = Array.from(map.values()).map(s => s.size);
    this.reponsesChart = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Clients', data: counts,
        backgroundColor: '#3498db', borderRadius: 6, borderSkipped: false }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  }

  private renderRolesChart() {
    const canvas = document.getElementById('adminRolesChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.rolesChart) { this.rolesChart.destroy(); this.rolesChart = null; }
    const map = new Map<string, number>();
    for (const g of this.gestionnaire) {
      const role = g.role?.name || 'Sans rôle';
      map.set(role, (map.get(role) || 0) + 1);
    }
    const labels = Array.from(map.keys());
    const counts = Array.from(map.values());
    const palette = ['#1a56db','#27ae60','#e67e22','#8e44ad','#e74c3c','#16a085'];
    this.rolesChart = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Gestionnaires', data: counts,
        backgroundColor: labels.map((_, i) => palette[i % palette.length]),
        borderRadius: 8, borderSkipped: false }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  }

  private renderOffresChart() {
    const canvas = document.getElementById('adminOffresChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.offresChart) { this.offresChart.destroy(); this.offresChart = null; }
    const map = new Map<string, number>();
    for (const o of this.offres) {
      const cat = o.categorie || 'GENERAL';
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    const labels = Array.from(map.keys());
    const counts = Array.from(map.values());
    const palette = ['#27ae60','#1a56db','#e67e22','#8e44ad','#e74c3c','#16a085'];
    this.offresChart = new Chart(canvas, {
      type: 'pie',
      data: { labels, datasets: [{ data: counts,
        backgroundColor: labels.map((_, i) => palette[i % palette.length]), borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }
}
