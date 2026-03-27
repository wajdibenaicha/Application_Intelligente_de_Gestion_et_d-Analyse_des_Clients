import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Api } from '../../../services/api';

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
    questions : any[] = [];
    gestionnaire: any [] = [];
    responses : any [] = [];
    roles : any [] = [];
    permissions : any [] = [];
    offres : any [] = [];

    selectdreponse: any = null;
    selectedoffreid: number | null = null;

    showgestform = false;
    editinggest: any = null;
    gestform: any = {
        full_name: '',
        email: '',
        password: '' , 
        role: null
    };

    showquestform = false;
    editingquest: any = null;
    newquest: any = { titre: '', type: 'text', options: '' };
    showaddquestion = false;
    selectedquestion: any[] = [];
    questform: any = {
        title: '',
        questions: []
    };
    dragoverIndex = -1;

    showroleform = false;
    editingrole: any = null;
    roleform: any = {
        name: '',
        permissions: null
    };

    showpermissionform = false;
    editingpermission: any = null;
    permissionform: any = {
        name: ''
    };

    showoffreform = false;
    editingoffre: any = null;
    offreform: any = {
        description: ''
    };

    showresponseform = false;
    editingresponse: any = null
    responseform: any = {
        questionnaireId: null,
        answers: []
    };

    showsendquestform = false;
    sendform: any = {
        questionnaireId: null,
        email: ''
    };

    showsendoffreform = false;
    sendoffreform: any = {
        offreId: null,
        email: ''
    };

    constructor(
        private api: Api,
        private router: Router,
        @Inject(PLATFORM_ID) private platformId: Object,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        forkJoin({
            questionnaires: this.api.getQuestionnaires(),
            questions: this.api.getQuestions(),
            gestionnaire: this.api.getGestionnaires(),
            roles: this.api.getroles(),
            permissions: this.api.getpermissions(),
            offres: this.api.getoffres(),
            responses: this.api.getResponses()
        }).subscribe({
            next: (results) => {
                this.questionnaires = results.questionnaires;
                this.questions = results.questions;
                this.gestionnaire = results.gestionnaire;
                this.roles = results.roles;
                this.permissions = results.permissions;
                this.offres = results.offres;
                this.responses = results.responses;
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
    }

    logout() {
        if (isPlatformBrowser(this.platformId)) sessionStorage.clear();
        this.router.navigate(['/login']);
    }

    openaddgestionnaire() {
        this.editinggest = null;
        this.gestform = {
            full_name: '',
            email: '',
            password: '' ,
            role: null 
        };
        this.showgestform = true;
    }

    openeditgestionnaire(gest: any) {
        this.editinggest = gest;
        this.gestform = {
            name: gest.full_name,
            email: gest.email,
            password: '' ,
            role : gest.role
        };
        this.showgestform = true;
    }

    savegestionnaire() {
        if (this.editinggest) {
            this.api.updateGestionnaire(this.editinggest.id, this.gestform).subscribe((updated: any) => {
                const index = this.gestionnaire.findIndex(g => g.id === this.editinggest.id);
                if (index !== -1) {
                    this.gestionnaire[index] = updated;
                }
                this.showgestform = false;
            });
        } else {
            this.api.addGestionnaire(this.gestform).subscribe((newgest: any) => {
                this.gestionnaire.push(newgest);
                this.showgestform = false;
            });
        }
    }

    deletegestionnaire(id: number) {
        if(confirm('supprimer ce gestionnaire ?')){
            this.api.deleteGestionnaire(id).subscribe(() => {
                this.gestionnaire = this.gestionnaire.filter(g => g.id !== id);
            });
        }
    }

    openaddquestionnaire() {
        this.editingquest = null;
        this.questform = {
            titre: '',
            description: '',
            questions: []
        };
        this.showquestform = true;
    }

    oppeneditquestionnaire(quest: any) {
        this.editingquest = quest;
        this.questform = {
            titre: quest.titre,
            description: quest.description,
            questions: quest.questions.map((q: any) => q.id)
        };
        this.selectedquestion = this.questions.filter(q => quest.questions.some((qq: any) => qq.id === q.id));
        this.showquestform = true;
    }

    savequestionnaire() {
        this.questform.questions = this.selectedquestion;
        if (this.editingquest) {
            this.api.updateQuestionnaire(this.editingquest.id, this.questform).subscribe({
                next: (updated: any) => {
                    const index = this.questionnaires.findIndex(q => q.id === this.editingquest.id);
                    if (index !== -1) {
                        this.questionnaires[index] = updated;
                    }
                    this.showquestform = false;
                },
                error: () => { this.showquestform = false; }
            });
        } else {
            this.api.addQuestionnaire(this.questform).subscribe({
                next: (newquest: any) => {
                    this.questionnaires.push(newquest);
                    this.showquestform = false;
                },
                error: () => { this.showquestform = false; }
            });
        }
    }

    deletequestionnaire(id: number) {
        if(confirm('supprimer ce questionnaire ?')){
            this.api.deleteQuestionnaire(id).subscribe(() => {
                this.questionnaires = this.questionnaires.filter(q => q.id !== id);
            });
        }
    }

    confirmquestionnaire(id: number) {
        this.api.confirmQuestionnaire(id).subscribe((updated: any) => {
            const index = this.questionnaires.findIndex(q => q.id === id);
            if (index !== -1){
                this.questionnaires[index] = updated;
            }
        });
    }

    isselectedquestion(id: number): boolean {
        return this.questform.questions.includes(id);
    }

    changequestion(id: number) {
        if (this.isselectedquestion(id)) {
            this.questform.questions = this.questform.questions.filter((qId: number) => qId !== id);
            this.selectedquestion = this.selectedquestion.filter(q => q.id !== id);
        } else {
            this.questform.questions.push(id);
            const question = this.questions.find(q => q.id === id);
            if (question) this.selectedquestion.push(question);
        }
    }

    removeselectedquestion(id: number) {
        this.questform.questions = this.questform.questions.filter((qId: number) => qId !== id);
        this.selectedquestion = this.selectedquestion.filter(q => q.id !== id);
    }

    createaddquestion() {
        if (!this.newquest.titre) return ; 
        this.api.addQuestion(this.newquest).subscribe((c: any) => {
            this.selectedquestion.push(c);
            this.questions.push(c);
            this.newquest = {
                titre: '',
                type: 'text',
                options: []
            };
            this.showaddquestion = false;
        });  
    }

    dragStart(i: number, e: DragEvent) { 
        e.dataTransfer?.setData('text/plain', i.toString()); 
    }

    dragover(i : number, e: DragEvent){
        e.preventDefault();
        this.dragoverIndex = i;
    }

    drop(toindex : number, e: DragEvent) {
        e.preventDefault();
        const from = parseInt(e.dataTransfer?.getData('text/plain') || '0');
        const item = this.selectedquestion.splice(from, 1)[0];
        this.selectedquestion.splice(toindex, 0, item);
        this.dragoverIndex = -1;
        this.questform.questions = this.selectedquestion.map(q => q.id);
    }

    openaddoffre() {
        this.editingoffre = null;
        this.offreform = {
            title: '',
            description: ''
        };
        this.showoffreform = true;
    }

    openeditoffre(offre: any) {
        this.editingoffre = offre;
        this.offreform = {
            title: offre.title,
            description: offre.description
        };
        this.showoffreform = true;
    }

    saveoffre() {
        if (this.editingoffre) {
            this.api.updateoffre(this.editingoffre.id, this.offreform).subscribe((updated: any) => {
                const index = this.offres.findIndex(o => o.id === this.editingoffre.id);
                if (index !== -1) {
                    this.offres[index] = updated;
                }
                this.showoffreform = false;
            });
        } else {
            this.api.addoffre(this.offreform).subscribe((newoffre: any) => {
                this.offres.push(newoffre);
                this.showoffreform = false;
            });
        }
    }

    deleteoffre(id: number) {
        if(confirm('supprimer cette offre ?')){
            this.api.deleteoffre(id).subscribe(() => {
                this.offres = this.offres.filter(o => o.id !== id);
            }); 
        }
    }

    deletereponse(id: number) {
        if(confirm('supprimer cette réponse ?')){
            this.api.deleteResponse(id).subscribe(() => {
                this.responses = this.responses.filter(r => r.id !== id);
            }); 
        }
    }

    opensendoffres(r : any) {
        this.selectdreponse = r;
        this.selectedoffreid = null;
        this.showsendoffreform = true;
    }

    sendoffre() {
        if (!this.selectedoffreid) return;
        const offre = this.offres.find(o => o.id === this.selectedoffreid);
        alert(`Offre "${offre.title}" envoyée à ${this.selectdreponse.email}`);
        this.showsendoffreform = false;
    }

    groupresponses() : any[] {
        const grouped: any = {};
        this.responses.forEach(r => {
            const key = r.questionnaire?.id  || 'unknown';
            if (!grouped[key]) grouped[key] = { questionnaire: r.questionnaire, reponses: [] };
            grouped[key].reponses.push(r);
        });
        return Object.values(grouped);
    }

    openaddrole() {
        this.editingrole = null;
        this.roleform = {
            name: '',
            permissions: []
        };
        this.showroleform = true;
    }

    openeditrole(role: any) {
        this.editingrole = role;
        this.roleform = {
            name: role.name,
            permissions: role.permissions
        };
        this.showroleform = true;
    }

    saverole() {
        if (this.editingrole) {
            this.api.updaterole(this.editingrole.id, this.roleform).subscribe((updated: any) => {
                const index = this.roles.findIndex(r => r.id === this.editingrole.id);
                if (index !== -1) {
                    this.roles[index] = updated;
                }
                this.showroleform = false;
            });
        } else {
            this.api.addrole(this.roleform).subscribe((newrole: any) => {
                this.roles.push(newrole);
                this.showroleform = false;
            });
        }
    }

    deleterole(id: number) {
        if(confirm('supprimer ce rôle ?')){
            this.api.deleterole(id).subscribe(() => {
                this.roles = this.roles.filter(r => r.id !== id);
            }); 
        }
    }

    openaddpermission() {
        this.editingpermission = null;
        this.permissionform = {
            name: ''
        };
        this.showpermissionform = true;
    }

    openeditpermission(permission: any) {
        this.editingpermission = permission;
        this.permissionform = {
            name: permission.name
        };
        this.showpermissionform = true;
    }

    savepermission() {    
        if (this.editingpermission) {
            this.api.updatepermission(this.editingpermission.id, this.permissionform).subscribe((updated: any) => {
                const index = this.permissions.findIndex(p => p.id === this.editingpermission.id);
                if (index !== -1) {
                    this.permissions[index] = updated;
                } 
                this.showpermissionform = false;
            });
        } else {
            this.api.addpermission(this.permissionform).subscribe((newpermission: any) => {
                this.permissions.push(newpermission);
                this.showpermissionform = false;
            }); 
        }
    }

    deletepermission(id: number) {  
        if(confirm('supprimer cette permission ?')){
            this.api.deletepermission(id).subscribe(() => {
                this.permissions = this.permissions.filter(p => p.id !== id);
            });
        }
    }

    get unconfirmedCount() { 
        return this.questionnaires.filter(q => !q.confirmed).length; 
    }
}