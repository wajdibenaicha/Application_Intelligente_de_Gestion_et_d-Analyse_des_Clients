import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import Swal from 'sweetalert2';
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
    activeTab = 'gestionnaires';
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
    offreform: any = { title: '', description: '' };

    showdetailsform = false;
    detailsquest: any = null;

    showsendoffreform = false;
    sendoffreform: any = { offreId: null, email: '' };

    constructor(private api: Api, private router: Router, private wsService: WebSocketService, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

    toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed; }
    logout() { this.router.navigate(['/login']); }

    ngOnInit(): void {
        this.wsService.connect();
        this.wsService.gestionnaires$.subscribe(data => { this.gestionnaire = data; this.cdr.detectChanges(); });
        this.wsService.questionnaires$.subscribe(data => { this.questionnaires = data; this.cdr.detectChanges(); });
        this.wsService.question$.subscribe(data => { this.questions = data; this.cdr.detectChanges(); });
        this.wsService.role$.subscribe(data => { this.roles = data; this.cdr.detectChanges(); });
        this.wsService.permission$.subscribe(data => { this.permissions = data; this.cdr.detectChanges(); });
        this.wsService.offre$.subscribe(data => { this.offres = data; this.cdr.detectChanges(); });

        this.loadInitialData();
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

    openaddquestionnaire() {
        this.editingquest = null;
        this.selectedquestion = [];
        this.questform = { titre: '', description: '', questions: [] };
        this.showquestform = true;
    }

    oppeneditquestionnaire(quest: any) {
        this.editingquest = quest;
        this.questform = {
            titre: quest.titre,
            description: quest.description,
            questions: quest.questions ? quest.questions.map((q: any) => q.id) : []
        };
        this.selectedquestion = quest.questions ? [...quest.questions] : [];
        this.showquestform = true;
    }

    savequestionnaire() {
        this.questform.questions = this.selectedquestion;
        this.showquestform = false;
        if (this.editingquest) {
            this.api.updateQuestionnaire(this.editingquest.id, this.questform).subscribe({
                next: () => {
                    Swal.fire({ icon: 'success', title: 'Questionnaire modifié', timer: 1500, showConfirmButton: false });
                },
                error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de modifier le questionnaire.' })
            });
        } else {
            this.api.addQuestionnaire(this.questform).subscribe({
                next: () => {
                    Swal.fire({ icon: 'success', title: 'Questionnaire créé', timer: 1500, showConfirmButton: false });
                },
                error: () => Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de créer le questionnaire.' })
            });
        }
    }

    async deletequestionnaire(id: number) {
        const result = await Swal.fire({
            title: 'Supprimer ce questionnaire ?',
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
                this.api.deleteQuestionnaire(id).subscribe({
                    next: () => {
                        Swal.fire({ icon: 'success', title: 'Supprimé !', timer: 1200, showConfirmButton: false });
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

    async confirmquestionnaire(id: number) {
        const result = await Swal.fire({
            title: 'Confirmer ce questionnaire ?',
            text: 'Il sera publié et visible par les clients.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Confirmer',
            cancelButtonText: 'Annuler'
        });
        if (result.isConfirmed) {
            this.ngZone.run(() => {
                this.api.confirmQuestionnaire(id).subscribe({
                    next: () => {
                        Swal.fire({ icon: 'success', title: 'Questionnaire confirmé !', timer: 1500, showConfirmButton: false });
                    },
                    error: () => Swal.fire({ icon: 'error', title: 'Erreur lors de la confirmation' })
                });
            });
        }
    }

    isselectedquestion(id: number): boolean {
        for (let i = 0; i < this.questform.questions.length; i++) {
            if (this.questform.questions[i] === id) return true;
        }
        return false;
    }

    changequestion(id: number) {
        let found = false;
        for (let i = 0; i < this.questform.questions.length; i++) {
            if (this.questform.questions[i] === id) {
                found = true;
                break;
            }
        }
        if (found) {
            const newIds = [];
            for (let i = 0; i < this.questform.questions.length; i++) {
                if (this.questform.questions[i] !== id) newIds.push(this.questform.questions[i]);
            }
            this.questform.questions = newIds;
            const newSelected = [];
            for (let i = 0; i < this.selectedquestion.length; i++) {
                if (this.selectedquestion[i].id !== id) newSelected.push(this.selectedquestion[i]);
            }
            this.selectedquestion = newSelected;
        } else {
            this.questform.questions.push(id);
            for (let i = 0; i < this.questions.length; i++) {
                if (this.questions[i].id === id) {
                    this.selectedquestion.push(this.questions[i]);
                    break;
                }
            }
        }
    }

    removeselectedquestion(id: number) {
        const newIds = [];
        for (let i = 0; i < this.questform.questions.length; i++) {
            if (this.questform.questions[i] !== id) newIds.push(this.questform.questions[i]);
        }
        this.questform.questions = newIds;
        const newSelected = [];
        for (let i = 0; i < this.selectedquestion.length; i++) {
            if (this.selectedquestion[i].id !== id) newSelected.push(this.selectedquestion[i]);
        }
        this.selectedquestion = newSelected;
    }

    createaddquestion() {
        if (!this.newquest.titre) return;
        if (this.newquest.type !== 'text' && (!this.newquest.options || this.newquest.options.trim() === '')) return;
        this.api.addQuestion(this.newquest).subscribe((c: any) => {
            this.selectedquestion.push(c);
            this.questions.push(c);
            this.newquest = { titre: '', type: 'text', options: [] };
            this.showaddquestion = false;
        });
    }

    dragStart(i: number, e: DragEvent) { e.dataTransfer?.setData('text/plain', i.toString()); }
    dragover(i: number, e: DragEvent) { e.preventDefault(); this.dragoverIndex = i; }
    drop(toindex: number, e: DragEvent) {
        e.preventDefault();
        const from = parseInt(e.dataTransfer?.getData('text/plain') || '0');
        const item = this.selectedquestion.splice(from, 1)[0];
        this.selectedquestion.splice(toindex, 0, item);
        this.dragoverIndex = -1;
        const newIds = [];
        for (let i = 0; i < this.selectedquestion.length; i++) newIds.push(this.selectedquestion[i].id);
        this.questform.questions = newIds;
    }

    openaddoffre() {
        this.editingoffre = null;
        this.offreform = { title: '', description: '' };
        this.showoffreform = true;
    }

    openeditoffre(offre: any) {
        this.editingoffre = offre;
        this.offreform = { title: offre.title, description: offre.description };
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

    get unconfirmedCount() {
        let count = 0;
        for (let i = 0; i < this.questionnaires.length; i++) {
            if (!this.questionnaires[i].confirmed) count++;
        }
        return count;
    }
}