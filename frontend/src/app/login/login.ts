import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  full_name: string = '';
  password: string = '';
  isRobot: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  verifRobot() {
    this.isRobot = !this.isRobot;
    this.cdr.detectChanges();
  }

  verifUser() {
    this.errorMessage = '';
    if (!this.full_name || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.isRobot) {
      this.errorMessage = 'Veuillez cocher "Je ne suis pas un robot".';
      this.cdr.detectChanges();
      return;
    }
    this.isLoading = true;
    this.cdr.detectChanges();

    this.http.post<any>('http://localhost:8081/api/administrateurs/login', {
      fullName: this.full_name,
      password: this.password
    }).subscribe({
      next: (admin) => {
        this.isLoading = false;
        sessionStorage.setItem('user', JSON.stringify(admin));
        sessionStorage.setItem('role', 'administrateur');
        this.router.navigate(['/dashboard-admin']);
      },
      error: () => {
        this.http.post<any>('http://localhost:8081/api/gestionnaires/login', {
          fullName: this.full_name,
          password: this.password
        }).subscribe({
          next: (gest) => {
            this.isLoading = false;
            sessionStorage.setItem('user', JSON.stringify(gest));
            sessionStorage.setItem('role', 'gestionnaire');
            this.router.navigate(['/dashboard-gestionnaire']);
          },
          error: () => {
            this.isLoading = false;
            this.errorMessage = 'Nom complet ou mot de passe incorrect.';
            this.cdr.detectChanges();
          }
        });
      }
    });
  }
}