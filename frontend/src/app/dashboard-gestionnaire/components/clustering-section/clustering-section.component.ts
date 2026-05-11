import { Component, OnInit, OnDestroy, ElementRef, ViewChild, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../../services/api';

@Component({
  selector: 'app-clustering-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="clustering-wrapper">

  <!-- Header -->
  <div class="section-header">
    <h2>Segmentation Clients <span class="badge-ml">ML K-Means</span></h2>
    <p class="subtitle">
      Regroupement automatique de vos clients en segments homogènes
      basé sur 9 critères : KPI, ancienneté, prime, contrat, âge,
      situation familiale, profession, région et sentiment.
    </p>
    <div class="header-actions">
      <span class="ml-status" [class.up]="mlUp" [class.down]="!mlUp">
        {{ mlUp ? 'ML Service actif' : 'ML Service hors ligne' }}
      </span>
      <button class="btn-refresh" (click)="loadAll()" [disabled]="loading">
        {{ loading ? 'Chargement...' : 'Actualiser' }}
      </button>
    </div>
  </div>

  <!-- Loader -->
  <div *ngIf="loading" class="loader-center">
    <div class="spinner"></div>
    <p>Analyse en cours...</p>
  </div>

  <!-- Erreur ML service hors ligne -->
  <div *ngIf="!loading && !mlUp" class="ml-offline-banner">
    <span>Le service ML est hors ligne.</span>
    <code>cd ml-service &amp;&amp; python app.py</code>
  </div>

  <ng-container *ngIf="!loading && mlUp">

    <!-- Cards segments -->
    <div class="profiles-grid" *ngIf="profiles.length > 0">
      <div class="profile-card" *ngFor="let p of profiles" [style.border-color]="p.color">
        <div class="profile-dot" [style.background]="p.color"></div>
        <div class="profile-info">
          <h3>{{ p.name }}</h3>
          <p class="profile-desc">{{ p.description }}</p>
          <div class="profile-stats">
            <span class="stat"><b>{{ p.size }}</b> clients</span>
            <span class="stat"><b>{{ p.avg_kpi }}</b>/100 KPI moy.</span>
            <span class="priority-badge" [class]="'priority-' + p.priority?.toLowerCase()">
              {{ formatPriority(p.priority) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Scatter plot -->
    <div class="chart-container" *ngIf="scatterData.length > 0">
      <h3>Visualisation 2D des segments (PCA)</h3>
      <p class="chart-hint">Chaque point représente un client. Survolez pour voir son nom.</p>
      <div class="scatter-wrapper">
        <canvas #scatterCanvas width="700" height="400"></canvas>
      </div>
      <div class="legend">
        <span class="legend-item" *ngFor="let c of clusterMeta">
          <span class="legend-dot" [style.background]="c.color"></span>
          {{ c.name }} ({{ c.size }})
        </span>
      </div>
    </div>

    <!-- Table clients avec segment -->
    <div class="clients-table-container" *ngIf="clientSegments.length > 0">
      <h3>Clients et leurs segments</h3>
      <div class="search-bar">
        <input [(ngModel)]="searchTerm" placeholder="Rechercher un client..."
               (input)="filterClients()" />
        <select [(ngModel)]="filterSegment" (change)="filterClients()">
          <option value="">Tous les segments</option>
          <option *ngFor="let p of profiles" [value]="p.name">{{ p.name }}</option>
        </select>
      </div>
      <table class="clients-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Score KPI</th>
            <th>Segment</th>
            <th>Priorité</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let c of filteredClients">
            <td>{{ c.client_name }}</td>
            <td>
              <span class="kpi-val" [style.color]="c.kpi_score >= 70 ? '#059669' : c.kpi_score >= 40 ? '#d97706' : '#dc2626'">
                {{ c.kpi_score | number:'1.0-0' }}/100
              </span>
            </td>
            <td>
              <span class="seg-badge" [style.background]="c.segment_color || getSegmentColor(c.segment_name)">
                {{ c.segment_name }}
              </span>
            </td>
            <td>
              <span class="priority-badge" [class]="'priority-' + c.segment_priority?.toLowerCase()">
                {{ formatPriority(c.segment_priority) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </ng-container>

</div>
  `,
  styles: [`
    .clustering-wrapper { padding: 24px; font-family: 'Segoe UI', sans-serif; }
    .section-header { margin-bottom: 24px; }
    .section-header h2 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0 0 6px; }
    .badge-ml { background: #6366f1; color: #fff; font-size: 0.65rem; padding: 2px 8px; border-radius: 99px; vertical-align: middle; margin-left: 8px; }
    .subtitle { color: #64748b; font-size: 0.88rem; margin: 0 0 12px; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .ml-status { font-size: 0.8rem; font-weight: 600; padding: 4px 10px; border-radius: 99px; }
    .ml-status.up { background: #d1fae5; color: #065f46; }
    .ml-status.down { background: #fee2e2; color: #991b1b; }
    .btn-refresh { background: #6366f1; color: #fff; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
    .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
    .loader-center { text-align: center; padding: 60px; color: #64748b; }
    .spinner { width: 36px; height: 36px; border: 4px solid #e2e8f0; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .ml-offline-banner { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 10px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; color: #92400e; }
    .ml-offline-banner code { background: #fff; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem; }

    /* Cards */
    .profiles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .profile-card { border: 2px solid; border-radius: 12px; padding: 16px; display: flex; gap: 12px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .profile-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
    .profile-info h3 { margin: 0 0 4px; font-size: 1rem; color: #1e293b; }
    .profile-desc { font-size: 0.8rem; color: #64748b; margin: 0 0 10px; }
    .profile-stats { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .stat { font-size: 0.8rem; color: #475569; }

    /* Priority badges */
    .priority-badge { font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 99px; text-transform: uppercase; }
    .priority-retention_vip { background: #d1fae5; color: #065f46; }
    .priority-win_back      { background: #fee2e2; color: #991b1b; }
    .priority-upsell        { background: #dbeafe; color: #1e40af; }
    .priority-advocacy      { background: #ede9fe; color: #5b21b6; }
    .priority-urgent_care   { background: #ffedd5; color: #9a3412; }
    .priority-maintain      { background: #f1f5f9; color: #475569; }

    /* Scatter plot */
    .chart-container { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 32px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .chart-container h3 { margin: 0 0 4px; font-size: 1rem; color: #1e293b; }
    .chart-hint { font-size: 0.8rem; color: #94a3b8; margin: 0 0 16px; }
    .scatter-wrapper { overflow-x: auto; }
    .legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: #475569; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; }

    /* Table */
    .clients-table-container { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .clients-table-container h3 { margin: 0 0 12px; font-size: 1rem; color: #1e293b; }
    .search-bar { display: flex; gap: 10px; margin-bottom: 14px; }
    .search-bar input, .search-bar select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; flex: 1; }
    .clients-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .clients-table th { background: #f8fafc; color: #64748b; font-weight: 600; padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .clients-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .seg-badge { color: #fff; font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 99px; }
  `]
})
export class ClusteringSectionComponent implements OnInit, OnDestroy {

  @ViewChild('scatterCanvas') scatterCanvas!: ElementRef<HTMLCanvasElement>;

  private platformId = inject(PLATFORM_ID);
  private chart: any = null;

  loading    = false;
  mlUp       = false;
  profiles:  any[] = [];
  scatterData: any[] = [];
  clusterMeta: any[] = [];
  clientSegments: any[] = [];
  filteredClients: any[] = [];
  searchTerm    = '';
  filterSegment = '';

  private colorMap: Record<string, string> = {};

  constructor(private api: Api, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadAll(); }

  ngOnDestroy() { this.chart?.destroy(); }

  loadAll() {
    this.loading = true;
    this.mlUp    = false;
    this.profiles = [];
    this.scatterData = [];
    this.clusterMeta = [];
    this.clientSegments = [];
    this.filteredClients = [];
    this.cdr.detectChanges();

    this.api.getMlHealth().subscribe({
      next: (h) => {
        this.mlUp = h?.mlServiceUp === true;
        this.cdr.detectChanges();
        if (!this.mlUp) { this.loading = false; this.cdr.detectChanges(); return; }
        this.loadProfiles();
        this.loadVisualization();
      },
      error: () => {
        this.mlUp    = false;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadProfiles() {
    this.api.getClustersProfiles().subscribe({
      next: (data) => {
        this.profiles = Object.values(data || {});
        this.profiles.forEach((p: any) => this.colorMap[p.name] = p.color);
        this.cdr.detectChanges();
      },
      error: () => { this.cdr.detectChanges(); }
    });
  }

  private loadVisualization() {
    this.api.getClustersVisualization().subscribe({
      next: (data) => {
        this.scatterData = data?.points || [];
        this.clusterMeta = data?.clusters || [];
        // Build client table from visualization points (avoids 203 serial ML calls)
        this.clientSegments = this.scatterData.map((p: any) => {
          const meta = this.clusterMeta.find((c: any) => c.id === p.cluster) || {};
          return {
            client_id:           p.client_id,
            client_name:         p.name,
            client_mail:         '',
            client_type_contrat: '',
            segment_name:        meta['name'] || `Segment ${p.cluster}`,
            segment_color:       meta['color'] || '#6b7280',
            segment_priority:    meta['priority'] || 'MAINTAIN',
            kpi_score:           p.kpi_score,
          };
        });
        this.filteredClients = [...this.clientSegments];
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => { this.renderChart(); this.cdr.detectChanges(); }, 100);
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  filterClients() {
    this.filteredClients = this.clientSegments.filter(c => {
      const matchSearch = !this.searchTerm ||
        c.client_name?.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchSeg = !this.filterSegment || c.segment_name === this.filterSegment;
      return matchSearch && matchSeg;
    });
  }

  getSegmentColor(name: string): string {
    return this.colorMap[name] || '#6b7280';
  }

  formatPriority(priority: string): string {
    return ({
      'RETENTION_VIP': 'VIP',
      'WIN_BACK':      'À reconquérir',
      'UPSELL':        'Upsell',
      'ADVOCACY':      'Ambassadeur',
      'URGENT_CARE':   'Urgent',
      'MAINTAIN':      'Stable',
    } as any)[priority] || priority;
  }

  private renderChart() {
    if (!isPlatformBrowser(this.platformId) || !this.scatterCanvas) return;
    if (this.scatterData.length === 0) return;

    const ctx = this.scatterCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chart?.destroy();

    // Grouper les points par cluster
    const datasets = this.clusterMeta.map((cluster: any) => ({
      label: cluster.name,
      data: this.scatterData
        .filter((p: any) => p.cluster === cluster.id)
        .map((p: any) => ({ x: p.x, y: p.y, name: p.name, kpi: p.kpi_score })),
      backgroundColor: cluster.color + 'cc',
      pointRadius: 7,
      pointHoverRadius: 9,
    }));

    const Chart = (window as any).Chart;
    if (!Chart) { this.loadChartJs(ctx, datasets); return; }
    this.buildChart(ctx, datasets);
  }

  private buildChart(ctx: CanvasRenderingContext2D, datasets: any[]) {
    import('chart.js/auto').then(({ default: Chart }) => {
      this.chart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
          responsive: false,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: (item: any) => {
                  const raw = item.raw as any;
                  return `${raw.name} — KPI ${raw.kpi}`;
                }
              }
            }
          },
          scales: {
            x: { title: { display: true, text: 'Composante PCA 1' } },
            y: { title: { display: true, text: 'Composante PCA 2' } },
          }
        }
      });
    });
  }

  private loadChartJs(ctx: CanvasRenderingContext2D, datasets: any[]) {
    this.buildChart(ctx, datasets);
  }
}
