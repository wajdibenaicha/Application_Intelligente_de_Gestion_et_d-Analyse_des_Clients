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
        titre: '',
        description: '',
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
        title: '',
        description: ''
    };

    showsendoffreform = false;
    sendoffreform: any = {
        offreId: null,
        email: ''
    };



  constructor(private api: Api, private router: Router) {}

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout() {
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    this.api.getQuestionnaires().subscribe((data: any) => {
      this.questionnaires = data;
    }); 
    this.api.getQuestions().subscribe((data: any) => {
      this.questions = data;
    });
    this.api.getGestionnaires().subscribe((data: any) => {
      this.gestionnaire = data;
    });
    this.api.getroles().subscribe((data: any) => {
      this.roles = data;

    
    }); 
    this.api.getpermissions().subscribe((data: any) => {
      this.permissions = data;
    });
    this.api.getoffres().subscribe((data: any) => {
      this.offres = data;
    });
  this.api.getResponses().subscribe((data: any) => {     
     this.responses = data ;
    });
  
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
        if (confirm('Supprimer ce gestionnaire ?')) {
            this.api.deleteGestionnaire(id).subscribe(() => {
                this.gestionnaire = this.gestionnaire.filter(g => g.id !== id);
            });
        }
    }

    openaddquestionnaire() {
        this.editingquest = null;
        this.selectedquestion = [];
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
            questions: quest.questions ? quest.questions.map((q: any) => q.id) : []
        };
        this.selectedquestion = quest.questions ? [...quest.questions] : [];
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
        if (confirm('Supprimer ce questionnaire ?')) {
            this.api.deleteQuestionnaire(id).subscribe(() => {
                this.questionnaires = this.questionnaires.filter(q => q.id !== id);
            });
        }
    }

    confirmquestionnaire(id: number) {
        this.api.confirmQuestionnaire(id).subscribe((updated: any) => {
            const index = this.questionnaires.findIndex(q => q.id === id);
            if (index !== -1) {
                this.questionnaires[index] = updated;
            }
        });
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
                if (this.questform.questions[i] !== id) {
                    newIds.push(this.questform.questions[i]);
                }
            }
            this.questform.questions = newIds;

            const newSelected = [];
            for (let i = 0; i < this.selectedquestion.length; i++) {
                if (this.selectedquestion[i].id !== id) {
                    newSelected.push(this.selectedquestion[i]);
                }
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
            if (this.questform.questions[i] !== id) {
                newIds.push(this.questform.questions[i]);
            }
        }
        this.questform.questions = newIds;

        const newSelected = [];
        for (let i = 0; i < this.selectedquestion.length; i++) {
            if (this.selectedquestion[i].id !== id) {
                newSelected.push(this.selectedquestion[i]);
            }
        }
        this.selectedquestion = newSelected;
    }

    createaddquestion() {
        if (!this.newquest.titre) return;
        this.api.addQuestion(this.newquest).subscribe((c: any) => {
            this.selectedquestion.push(c);
            this.questions.push(c);
            this.newquest = { titre: '', type: 'text', options: [] };
            this.showaddquestion = false;
        });
    }

    dragStart(i: number, e: DragEvent) {
        e.dataTransfer?.setData('text/plain', i.toString());
    }

    dragover(i: number, e: DragEvent) {
        e.preventDefault();
        this.dragoverIndex = i;
    }

    drop(toindex: number, e: DragEvent) {
        e.preventDefault();
        const from = parseInt(e.dataTransfer?.getData('text/plain') || '0');
        const item = this.selectedquestion.splice(from, 1)[0];
        this.selectedquestion.splice(toindex, 0, item);
        this.dragoverIndex = -1;

        const newIds = [];
        for (let i = 0; i < this.selectedquestion.length; i++) {
            newIds.push(this.selectedquestion[i].id);
        }
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
        if (confirm('Supprimer cette offre ?')) {
            this.api.deleteoffre(id).subscribe(() => {
                this.offres = this.offres.filter(o => o.id !== id);
            });
        }
    }

    deletereponse(id: number) {
        if (confirm('Supprimer cette réponse ?')) {
            this.api.deleteResponse(id).subscribe(() => {
                this.responses = this.responses.filter(r => r.id !== id);
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

        alert('Offre "' + offreTitle + '" envoyée à ' + this.selectdreponse.email);
        this.showsendoffreform = false;
    }

    groupresponses(): any[] {
        const grouped: any = {};

        for (let i = 0; i < this.responses.length; i++) {
            const r = this.responses[i];
            const key = r.questionnaire ? r.questionnaire.id : 'unknown';

            if (!grouped[key]) {
                grouped[key] = { questionnaire: r.questionnaire, reponses: [] };
            }

            grouped[key].reponses.push(r);
        }

        const result = [];
        const keys = Object.keys(grouped);
        for (let i = 0; i < keys.length; i++) {
            result.push(grouped[keys[i]]);
        }

        return result;
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

    saverole() {      if (this.editingrole) {
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
        if (confirm('Supprimer ce rôle ?')) {
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
        if (confirm('Supprimer cette permission ?')) {
            this.api.deletepermission(id).subscribe(() => {
                this.permissions = this.permissions.filter(p => p.id !== id);
            });
        }
    }

    get unconfirmedCount() {
        let count = 0;
        for (let i = 0; i < this.questionnaires.length; i++) {
            if (this.questionnaires[i].statut === 'EN_ATTENTE') {
                count++;
            }
        }
        return count;
    }
}