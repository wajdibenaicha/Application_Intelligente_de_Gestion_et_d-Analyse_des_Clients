import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import Swal from 'sweetalert2';
import Chart from 'chart.js/auto';
import { Api } from '../../../services/api';
import { WebSocketService } from '../../../services/websocket.service';

@Component({
  selector: 'app-dashbord-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashbord-admin.html',
  styleUrl: './dashbord-admin.css'
})
export class DashbordAdmin implements OnInit {
    activeTab = 'home';

    private statutChart:  Chart | null = null;
    private reponsesChart: Chart | null = null;
    private rolesChart:   Chart | null = null;
    private offresChart:  Chart | null = null;
    private participationChart: Chart | null = null;
    totalClientsCount: number = 0;
    displayGestCount  = 0;
    displayQuestCount = 0;
    displayRepCount   = 0;
    displayOffresCount = 0;
    sidebarCollapsed = false;
    today: Date = new Date();
    isLoading = true;

    questionnaires: any[] = [];
    questions: any[] = [];
    gestionnaire: any[] = [];
    responses: any[] = [];
    roles: any[] = [];
    permissions: any[] = [];
    offres: any[] = [];

    selectdreponse: any = null;
    selectedoffreid: number | null = null;

    showClientReponsesModal = false;
    selectedClientData: any = null;
    selectedClientReponses: any[] = [];

    showgestform = false;
    editinggest: any = null;
    gestform: any = { fullName: '', email: '', password: '', role: null };

    showquestform = false;
    editingquest: any = null;
    newquest: any = { titre: '', type: 'text', options: '' };
    showaddquestion = false;
    selectedquestion: any[] = [];
    questform: any = { titre: '', description: '', questions: [] };
    dragoverIndex = -1;

    showroleform = false;
    editingrole: any = null;
    roleform: any = { name: '', permission: null };

    showpermissionform = false;
    editingpermission: any = null;
    permissionform: any = { description: '' };

    isSubmitting = false;

    showoffreform = false;
    editingoffre: any = null;
    offreform: any = { title: '', description: '', categorie: 'general', scoreMin: 0, scoreMax: 100, active: true };

    showdetailsform = false;
    detailsquest: any = null;

    showsendoffreform = false;
    sendoffreform: any = { offreId: null, email: '' };

    notifications: any[] = [];
    unreadNotifCount = 0;
    showNotifPanel = false;

    selectedQuestionnaireId: string = '';
    adminReponses: any[] = [];

    constructor(private api: Api, private router: Router, private wsService: WebSocketService, private ngZone: NgZone, private cdr: ChangeDetectorRef, private http: HttpClient) {}

    private countUp(target: number, setter: (v: number) => void, duration = 1100) {
        const startTime = performance.now();
        const tick = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setter(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
            else { setter(target); this.cdr.detectChanges(); }
        };
        requestAnimationFrame(tick);
    }

    toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed; }
    logout() { this.router.navigate(['/login']); }

    setTab(tab: string) {
      this.activeTab = tab;
      if (tab === 'home') {
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
        options: { plugins: { legend: { position: 'bottom' } }, cutout: '60%' }
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
        options: { indexAxis: 'y', plugins: { legend: { display: false } },
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
        options: { plugins: { legend: { display: false } },
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
        options: { plugins: { legend: { position: 'bottom' } } }
      });
    }

    ngOnInit(): void {
        this.wsService.connect();
        this.wsService.gestionnaires$.subscribe(data => { this.gestionnaire = data; this.cdr.detectChanges(); });
        this.wsService.questionnaires$.subscribe(data => { this.questionnaires = data; this.cdr.detectChanges(); });
        this.wsService.question$.subscribe(data => { this.questions = data; this.cdr.detectChanges(); });
        this.wsService.role$.subscribe(data => { this.roles = data; this.cdr.detectChanges(); });
        this.wsService.permission$.subscribe(data => { this.permissions = data; this.cdr.detectChanges(); });
        this.wsService.offre$.subscribe(data => { this.offres = data; this.cdr.detectChanges(); });
        this.wsService.adminNotifications$.subscribe(data => {
            // admin sees only password reset notifications
            const adminOnly = data.filter((n: any) => n.type === 'DEMANDE_MOT_DE_PASSE');
            this.notifications = adminOnly;
            this.unreadNotifCount = adminOnly.filter((n: any) => !n.vue).length;
            this.cdr.detectChanges();
        });

        this.loadInitialData();
        this.loadNotifications();
        this.http.get<any[]>('http://localhost:8081/api/clients').subscribe({ next: (c) => this.totalClientsCount = c.length, error: () => {} });
    }

    private loadInitialData(): void {
        this.isLoading = true;
        const requests = [
            this.api.getQuestionnaires().pipe(catchError(() => of([]))),
            this.api.getQuestions().pipe(catchError(() => of([]))),
            this.api.getGestionnaires().pipe(catchError(() => of([]))),
            this.api.getroles().pipe(catchError(() => of([]))),
            this.api.getpermissions().pipe(catchError(() => of([]))),
            this.api.getoffres().pipe(catchError(() => of([]))),
            this.api.getResponses().pipe(catchError(() => of([])))
        ];
        forkJoin(requests).subscribe({
            next: ([questionnaires, questions, gestionnaire, roles, permissions, offres, responses]) => {
                this.questionnaires = questionnaires as any[];
                this.questions = questions as any[];
                this.gestionnaire = gestionnaire as any[];
                this.roles = roles as any[];
                this.permissions = permissions as any[];
                this.offres = offres as any[];
                this.responses = responses as any[];
                this.isLoading = false;
                this.cdr.detectChanges();
                this.countUp(this.gestionnaire.length,  v => { this.displayGestCount   = v; this.cdr.detectChanges(); });
                this.countUp(this.questionnaires.length, v => { this.displayQuestCount  = v; this.cdr.detectChanges(); });
                this.countUp(this.totalReponsesCount,    v => { this.displayRepCount    = v; this.cdr.detectChanges(); });
                this.countUp(this.offres.length,         v => { this.displayOffresCount = v; this.cdr.detectChanges(); });
                if (this.activeTab === 'home') setTimeout(() => this.renderAllCharts(), 200);
            },
            error: () => {
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
        setTimeout(() => {
            if (this.isLoading) {
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        }, 5000);
    }

    loadNotifications() {
        this.api.getAdminNotifications().subscribe(data => {
            this.notifications = data;
            this.unreadNotifCount = data.filter((n: any) => !n.vue).length;
            this.cdr.detectChanges();
        });
    }

    toggleNotifPanel() { this.showNotifPanel = !this.showNotifPanel; }

    approuverQuestionnaire(id: number) {
        this.api.approuverPublication(id).subscribe(() => {
            Swal.fire('Approuvé', 'Questionnaire approuvé avec succès', 'success');
            this.loadNotifications();
            this.loadInitialData();
        });
    }

    reinitialiserMotDePasse(gestionnaireId: number) {
        Swal.fire({
            title: 'Réinitialiser le mot de passe',
            html: `<p style="margin-bottom:12px;color:#555">Entrez le nouveau mot de passe pour ce gestionnaire.</p>`,
            input: 'password',
            inputPlaceholder: 'Nouveau mot de passe...',
            inputAttributes: { autocomplete: 'new-password', minlength: '4' },
            showCancelButton: true,
            confirmButtonText: 'Réinitialiser',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#27ae60',
            cancelButtonColor: '#95a5a6',
            reverseButtons: true,
            inputValidator: (value) => {
                if (!value || value.trim().length < 4) return 'Le mot de passe doit contenir au moins 4 caractères.';
                return null;
            }
        }).then(result => {
            if (!result.isConfirmed || !result.value) return;
            this.api.resetPasswordByAdmin(gestionnaireId, result.value).subscribe({
                next: () => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Mot de passe réinitialisé',
                        text: 'Le gestionnaire a reçu un email avec son nouveau mot de passe.',
                        confirmButtonColor: '#27ae60',
                        timer: 3000,
                        showConfirmButton: false
                    });
                    this.loadNotifications();
                    this.cdr.detectChanges();
                },
                error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de réinitialiser le mot de passe.' })
            });
        });
    }

    demanderRaisonEtRejeter(id: number) {
        Swal.fire({
            title: 'Raison du rejet',
            input: 'textarea',
            inputPlaceholder: 'Expliquez la raison du rejet...',
            showCancelButton: true,
            confirmButtonText: 'Rejeter',
            cancelButtonText: 'Annuler',
            inputValidator: (value) => {
                if (!value || !value.trim()) return 'La raison est obligatoire.';
                return null;
            }
        }).then(result => {
            if (result.isConfirmed && result.value) {
                this.rejeterQuestionnaire(id, result.value);
            }
        });
    }

    rejeterQuestionnaire(id: number, raison: string) {
        this.api.rejeterPublication(id, raison).subscribe({
            next: () => {
                Swal.fire({ icon: 'info', title: 'Rejeté', text: 'La demande a été rejetée.', timer: 1500, showConfirmButton: false });
                this.loadNotifications();
                this.loadInitialData();
            },
            error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de rejeter la demande.' })
        });
    }

    openaddgestionnaire() {
        this.editinggest = null;
        this.gestform = { fullName: '', email: '', password: '', role: null };
        this.showgestform = true;
    }

    openeditgestionnaire(gest: any) {
        this.editinggest = gest;
        this.gestform = { fullName: gest.fullName, email: gest.email, password: '', role: gest.role };
        this.showgestform = true;
    }

    savegestionnaire() {
        this.showgestform = false;
        if (this.editinggest) {
            this.api.updateGestionnaire(this.editinggest.id, this.gestform).subscribe({
                next: () => {
                    Swal.fire({ icon: 'success', title: 'Gestionnaire modifié', timer: 1500, showConfirmButton: false });
                },
                error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de modifier le gestionnaire.' })
            });
        } else {
            this.api.addGestionnaire(this.gestform).subscribe({
                next: () => {
                    Swal.fire({ icon: 'success', title: 'Gestionnaire ajouté', timer: 1500, showConfirmButton: false });
                },
                error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible d\'ajouter le gestionnaire.' })
            });
        }
    }

    async deletegestionnaire(id: number) {
        const result = await Swal.fire({
            title: 'Supprimer ce gestionnaire ?',
            text: 'Cette action est irréversible.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler'
        });
        if (result.isConfirmed) {
            this.ngZone.run(() => {
                this.api.deleteGestionnaire(id).subscribe({
                    next: () => {
                        Swal.fire({ icon: 'success', title: 'Supprimé !', timer: 1200, showConfirmButton: false });
                    },
                    error: () => Swal.fire({ icon: 'error', title: 'Erreur lors de la suppression' })
                });
            });
        }
    }

    openaddoffre() {
        this.editingoffre = null;
        this.offreform = { title: '', description: '', categorie: 'general', scoreMin: 0, scoreMax: 100, active: true };
        this.showoffreform = true;
    }

    openeditoffre(offre: any) {
        this.editingoffre = offre;
        this.offreform = {
            title: offre.title, description: offre.description,
            categorie: offre.categorie || 'general',
            scoreMin: offre.scoreMin ?? 0, scoreMax: offre.scoreMax ?? 100,
            active: offre.active !== false
        };
        this.showoffreform = true;
    }

    saveoffre() {
        this.showoffreform = false;
        if (this.editingoffre) {
            this.api.updateoffre(this.editingoffre.id, this.offreform).subscribe({
                next: () => {
                    Swal.fire({ icon: 'success', title: 'Offre modifiée', timer: 1500, showConfirmButton: false });
                },
                error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de modifier l\'offre.' })
            });
        } else {
            this.api.addoffre(this.offreform).subscribe({
                next: () => {
                    Swal.fire({ icon: 'success', title: 'Offre ajoutée', timer: 1500, showConfirmButton: false });
                },
                error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible d\'ajouter l\'offre.' })
            });
        }
    }

    async deleteoffre(id: number) {
        const result = await Swal.fire({
            title: 'Supprimer cette offre ?',
            text: 'Cette action est irréversible.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler'
        });
        if (result.isConfirmed) {
            this.ngZone.run(() => {
                this.api.deleteoffre(id).subscribe({
                    next: () => {
                        Swal.fire({ icon: 'success', title: 'Supprimée !', timer: 1200, showConfirmButton: false });
                    },
                    error: () => Swal.fire({ icon: 'error', title: 'Erreur lors de la suppression' })
                });
            });
        }
    }

    async deletereponse(id: number) {
        const result = await Swal.fire({
            title: 'Supprimer cette réponse ?',
            text: 'Cette action est irréversible.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler'
        });
        if (result.isConfirmed) {
            this.ngZone.run(() => {
                this.api.deleteResponse(id).subscribe({
                    next: () => {
                        this.responses = this.responses.filter(r => r.id !== id);
                        this.cdr.detectChanges();
                        Swal.fire({ icon: 'success', title: 'Supprimée !', timer: 1200, showConfirmButton: false });
                    },
                    error: () => Swal.fire({ icon: 'error', title: 'Erreur lors de la suppression' })
                });
            });
        }
    }

    opensendoffres(r: any) {
        this.selectdreponse = r;
        this.selectedoffreid = null;
        this.showsendoffreform = true;
    }

    sendoffre() {
        if (!this.selectedoffreid) return;
        let offreTitle = '';
        for (let i = 0; i < this.offres.length; i++) {
            if (this.offres[i].id === this.selectedoffreid) {
                offreTitle = this.offres[i].title;
                break;
            }
        }
        this.showsendoffreform = false;
        setTimeout(() => Swal.fire({
            icon: 'success',
            title: 'Offre envoyée !',
            text: `"${offreTitle}" envoyée au client.`,
            timer: 2000,
            showConfirmButton: false
        }));
    }

    groupresponses(): any[] {
        const grouped: any = {};
        for (let i = 0; i < this.responses.length; i++) {
            const r = this.responses[i];
            const key = r.questionnaire ? r.questionnaire.id : 'unknown';
            if (!grouped[key]) grouped[key] = { questionnaire: r.questionnaire, reponses: [] };
            grouped[key].reponses.push(r);
        }
        const result = [];
        const keys = Object.keys(grouped);
        for (let i = 0; i < keys.length; i++) result.push(grouped[keys[i]]);
        return result;
    }

    renderAdminParticipationChart() {
        const canvas = document.getElementById('adminParticipationChart') as HTMLCanvasElement;
        if (!canvas) return;
        if (this.participationChart) { this.participationChart.destroy(); this.participationChart = null; }
        const repondu = this.clientsReponses.length;
        this.participationChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ['Total clients', 'Ont répondu'],
                datasets: [{ data: [this.totalClientsCount, repondu],
                    backgroundColor: ['#1a56db', '#27ae60'], borderRadius: 8, barThickness: 40 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => {
                        const val = ctx.parsed.y ?? 0;
                        const pct = this.totalClientsCount > 0 ? Math.round((val / this.totalClientsCount) * 100) : 0;
                        return ` ${val} clients (${pct}%)`;
                    }}}},
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } }
            }
        });
    }

    loadAdminReponses() {
        if (!this.selectedQuestionnaireId) { this.adminReponses = []; return; }
        const titre = this.questionnaires.find(q => q.id == this.selectedQuestionnaireId)?.titre || 'Questionnaire';
        this.http.get<any[]>(`http://localhost:8081/api/reponses/questionnaire/${this.selectedQuestionnaireId}`).subscribe({
            next: (data) => {
                this.adminReponses = data;
                this.cdr.detectChanges();
                const nb = data.length;
                const clients = new Set(data.map(r => r.client?.id)).size;
                Swal.fire({
                    title: `${titre}`,
                    html: nb === 0
                        ? `<p>Aucune réponse reçue pour ce questionnaire.</p>`
                        : `<p><b>${clients} client${clients > 1 ? 's' : ''}</b> ont répondu à ce questionnaire.</p>`,
                    icon: nb === 0 ? 'info' : 'success',
                    confirmButtonText: nb === 0 ? 'OK' : 'Voir les réponses',
                    confirmButtonColor: '#27ae60',
                    timer: nb === 0 ? 2500 : undefined,
                    showConfirmButton: true
                }).then(() => {
                    setTimeout(() => this.renderAdminParticipationChart(), 150);
                });
            },
            error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de charger les réponses.' })
        });
    }

    get clientsReponses(): any[] {
        const map = new Map<any, any>();
        for (const r of this.adminReponses) {
            const id = r.client?.id ?? 'unknown';
            if (!map.has(id)) {
                map.set(id, { client: r.client, reponses: [], nbReponses: 0 });
            }
            const entry = map.get(id);
            entry.reponses.push(r);
            entry.nbReponses++;
        }
        return Array.from(map.values());
    }

    deleteReponseFromModal(id: number) {
        this.deletereponse(id);
        this.adminReponses = this.adminReponses.filter(r => r.id !== id);
        this.selectedClientReponses = this.selectedClientReponses.filter(r => r.id !== id);
        this.cdr.detectChanges();
    }

    voirReponsesClient(entry: any) {
        const questionnaireTitre = this.questionnaires.find(q => q.id == this.selectedQuestionnaireId)?.titre || 'Questionnaire';
        const nb = entry.nbReponses;
        const clientName = entry.client?.fullName || entry.client?.mail || 'Client';
        Swal.fire({
            title: `${questionnaireTitre}`,
            html: `<b>${clientName}</b> a soumis <b>${nb} réponse${nb > 1 ? 's' : ''}</b> à ce questionnaire.`,
            icon: 'info',
            confirmButtonText: 'Voir les réponses',
            showCancelButton: true,
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#27ae60',
            cancelButtonColor: '#95a5a6',
            reverseButtons: true
        }).then(result => {
            if (!result.isConfirmed) return;
            this.selectedClientData = entry.client;
            this.selectedClientReponses = entry.reponses;
            this.showClientReponsesModal = true;
            this.cdr.detectChanges();
        });
    }

    exportReponsesCSV() {
        if (this.adminReponses.length === 0) return;
        const titre = this.questionnaires.find(q => q.id == this.selectedQuestionnaireId)?.titre || 'questionnaire';
        const nomFichier = titre.replace(/ /g, '_');
        const d = new Date();
        const dateStr = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
        let lignes = 'Client;Email;Téléphone;Question;Type;Réponse\r\n';
        for (const entry of this.clientsReponses) {
            for (const r of entry.reponses) {
                const esc = (v: string) => '"' + (v || '').replace(/"/g, '""') + '"';
                lignes += [esc(entry.client?.fullName || ''), esc(entry.client?.mail || ''), esc(entry.client?.tel || ''), esc(r.question?.titre || ''), esc(r.question?.type || ''), esc(r.reponse || '')].join(';') + '\r\n';
            }
            lignes += '\r\n';
        }
        const blob = new Blob(['\uFEFF' + lignes], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `reponses_${nomFichier}_${dateStr}.csv`;
        a.click(); URL.revokeObjectURL(url);
    }

    openaddrole() {
        this.editingrole = null;
        this.roleform = { name: '', permission: null };
        this.showroleform = true;
    }

    openeditrole(role: any) {
        this.editingrole = role;
        this.roleform = { name: role.name, permission: role.permission };
        this.showroleform = true;
    }

    saverole() {
        this.showroleform = false;
        if (this.editingrole) {
            this.api.updaterole(this.editingrole.id, this.roleform).subscribe({
                next: () => {
                    Swal.fire({ icon: 'success', title: 'Rôle modifié', timer: 1500, showConfirmButton: false });
                },
                error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de modifier le rôle.' })
            });
        } else {
            this.api.addrole(this.roleform).subscribe({
                next: () => {
                    Swal.fire({ icon: 'success', title: 'Rôle ajouté', timer: 1500, showConfirmButton: false });
                },
                error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible d\'ajouter le rôle.' })
            });
        }
    }

    async deleterole(id: number) {
        const result = await Swal.fire({
            title: 'Supprimer ce rôle ?',
            text: 'Cette action est irréversible.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler'
        });
        if (result.isConfirmed) {
            this.ngZone.run(() => {
                this.api.deleterole(id).subscribe({
                    next: () => {
                        Swal.fire({ icon: 'success', title: 'Supprimé !', timer: 1200, showConfirmButton: false });
                    },
                    error: () => Swal.fire({ icon: 'error', title: 'Erreur lors de la suppression' })
                });
            });
        }
    }

    openaddpermission() {
        this.editingpermission = null;
        this.permissionform = { description: '' };
        this.showpermissionform = true;
    }

    openeditpermission(permission: any) {
        this.editingpermission = permission;
        this.permissionform = { description: permission.description };
        this.showpermissionform = true;
    }

    savepermission() {
        this.showpermissionform = false;
        if (this.editingpermission) {
            this.api.updatepermission(this.editingpermission.id, this.permissionform).subscribe({
                next: () => {
                    Swal.fire({ icon: 'success', title: 'Permission modifiée', timer: 1500, showConfirmButton: false });
                },
                error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de modifier la permission.' })
            });
        } else {
            this.api.addpermission(this.permissionform).subscribe({
                next: () => {
                    Swal.fire({ icon: 'success', title: 'Permission ajoutée', timer: 1500, showConfirmButton: false });
                },
                error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible d\'ajouter la permission.' })
            });
        }
    }

    async deletepermission(id: number) {
        const result = await Swal.fire({
            title: 'Supprimer cette permission ?',
            text: 'Cette action est irréversible.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler'
        });
        if (result.isConfirmed) {
            this.ngZone.run(() => {
                this.api.deletepermission(id).subscribe({
                    next: () => {
                        Swal.fire({ icon: 'success', title: 'Supprimée !', timer: 1200, showConfirmButton: false });
                    },
                    error: () => Swal.fire({ icon: 'error', title: 'Erreur lors de la suppression' })
                });
            });
        }
    }

    opendetailsquestionnaire(quest: any) {
        this.detailsquest = quest;
        this.showdetailsform = true;
    }

    get totalReponsesCount(): number {
        const unique = new Set(this.responses.map(r => `${r.client?.id}-${r.questionnaire?.id}`));
        return unique.size;
    }

    get unconfirmedCount() {
        let count = 0;
        for (let i = 0; i < this.questionnaires.length; i++) {
            if (!this.questionnaires[i].confirmed) count++;
        }
        return count;
    }

    getBadgeClass(q: any): string {
        const s = (q.statut || '').toUpperCase().trim();
        if (s === 'REJETE') return 'badge-danger';
        if (q.confirmed || s === 'APPROUVE' || s === 'PUBLIE') return 'badge-confirmed';
        if (s === 'EN_ATTENTE') return 'badge-pending';
        return 'badge-brouillon';
    }

    getStatutLabel(q: any): string {
        const s = (q.statut || '').toUpperCase().trim();
        if (s === 'REJETE') return 'Rejeté';
        if (q.confirmed || s === 'APPROUVE' || s === 'PUBLIE') return 'Approuvé';
        if (s === 'EN_ATTENTE') return 'En attente';
        return 'Brouillon';
    }
}