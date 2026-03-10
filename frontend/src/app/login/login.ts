import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
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

  constructor(private http: HttpClient, private router: Router) {}

  verifRobot() {
    this.isRobot = !this.isRobot;
  }

  verifUser() {
    this.errorMessage = '';

    if (!this.full_name || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }
    if (!this.isRobot) {
      this.errorMessage = 'Veuillez cocher "Je ne suis pas un robot".';
      return;
    }

    this.isLoading = true;

    this.http.post<{id: number, fullName: string, password: string}>(
      'http://localhost:8080/api/administrateurs/login',
      { fullName: this.full_name, password: this.password }
    ).subscribe({
      next: (admin) => {
        this.isLoading = false;
        sessionStorage.setItem('user', JSON.stringify(admin));
        sessionStorage.setItem('role', 'administrateur');
        this.router.navigate(['/dashboard-admin']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.errorMessage = 'Nom complet ou mot de passe incorrect.';
        } else if (err.status === 0) {
          this.errorMessage = 'Impossible de contacter le serveur.';
        } else {
          this.errorMessage = 'Une erreur est survenue.';
        }
      }
    });
  }
}