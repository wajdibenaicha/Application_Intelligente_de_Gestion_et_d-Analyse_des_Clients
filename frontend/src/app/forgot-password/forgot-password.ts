import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {

  email: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  emailSent: boolean = false;

  constructor(private http: HttpClient) {}

  sendResetEmail() {
    this.errorMessage = '';

    // Validation email
    if (!this.email) {
      this.errorMessage = 'Veuillez saisir votre adresse email.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Veuillez saisir une adresse email valide.';
      return;
    }

    this.isLoading = true;

    // Appel API backend - essaie d'abord administrateur, puis gestionnaire
    this.http.post('http://localhost:8080/api/password/forgot', { email: this.email })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.emailSent = true;
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading = false;
          if (err.status === 404) {
            this.errorMessage = 'Aucun compte trouvé avec cette adresse email.';
          } else if (err.status === 0) {
            this.errorMessage = 'Impossible de contacter le serveur.';
          } else {
            this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
          }
        }
      });
  }
}