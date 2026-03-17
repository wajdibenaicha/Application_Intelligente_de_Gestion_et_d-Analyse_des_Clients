import { Component, ChangeDetectorRef } from '@angular/core';
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
  successMessage: string = '';
  isLoading: boolean = false;
  emailSent: boolean = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  sendResetEmail() {
    this.errorMessage = '';
    this.successMessage = '';

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
    this.cdr.detectChanges();

    this.http.post('http://localhost:8081/api/password/forgot', { email: this.email },
      { observe: 'response' }
    ).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.status === 200) {
          this.emailSent = true;
        } else {
          this.errorMessage = 'Une erreur est survenue.';
        }
        this.cdr.detectChanges();
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
        this.cdr.detectChanges();
      }
    });
  }
}