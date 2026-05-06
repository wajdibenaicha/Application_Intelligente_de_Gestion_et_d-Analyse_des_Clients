import { Component, ChangeDetectorRef, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {

  step: 1 | 2 | 3 = 1;

  email = '';
  otpDigits = ['', '', '', '', '', ''];
  newPassword = '';
  confirmPassword = '';

  errorMessage = '';
  isLoading = false;
  showPassword = false;
  showConfirm = false;

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private readonly API = `${environment.apiUrl}/password`;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  get otpCode() { return this.otpDigits.join(''); }

  sendOtp() {
    this.errorMessage = '';
    if (!this.email) { this.errorMessage = 'Veuillez saisir votre adresse email.'; return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) { this.errorMessage = 'Adresse email invalide.'; return; }

    this.isLoading = true;
    this.http.post(`${this.API}/forgot`, { email: this.email }, { observe: 'response' }).subscribe({
      next: () => { this.isLoading = false; this.step = 2; this.cdr.detectChanges(); },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = err.status === 404 ? 'Aucun compte trouvé avec cette adresse email.' : 'Une erreur est survenue. Réessayez.';
        this.cdr.detectChanges();
      }
    });
  }

  onOtpInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '');
    this.otpDigits[index] = val ? val[val.length - 1] : '';
    if (val && index < 5) {
      setTimeout(() => this.otpInputs.toArray()[index + 1]?.nativeElement.focus(), 0);
    }
  }

  onOtpKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      setTimeout(() => this.otpInputs.toArray()[index - 1]?.nativeElement.focus(), 0);
    }
  }

  onOtpPaste(event: ClipboardEvent) {
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) || '';
    if (pasted.length === 6) {
      event.preventDefault();
      pasted.split('').forEach((c, i) => this.otpDigits[i] = c);
      setTimeout(() => this.otpInputs.toArray()[5]?.nativeElement.focus(), 0);
      this.cdr.detectChanges();
    }
  }

  verifyOtp() {
    this.errorMessage = '';
    if (this.otpCode.length < 6) { this.errorMessage = 'Entrez les 6 chiffres du code.'; return; }

    this.isLoading = true;
    this.http.post(`${this.API}/verify-otp`, { email: this.email, code: this.otpCode }, { observe: 'response' }).subscribe({
      next: () => { this.isLoading = false; this.step = 3; this.cdr.detectChanges(); },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Code incorrect ou expiré. Réessayez.';
        this.otpDigits = ['', '', '', '', '', ''];
        setTimeout(() => this.otpInputs.toArray()[0]?.nativeElement.focus(), 0);
        this.cdr.detectChanges();
      }
    });
  }

  resetPassword() {
    this.errorMessage = '';
    if (!this.newPassword || this.newPassword.length < 6) { this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.'; return; }
    if (this.newPassword !== this.confirmPassword) { this.errorMessage = 'Les mots de passe ne correspondent pas.'; return; }

    this.isLoading = true;
    this.http.post(`${this.API}/reset-with-otp`, { email: this.email, code: this.otpCode, newPassword: this.newPassword }, { observe: 'response' }).subscribe({
      next: () => { this.isLoading = false; this.step = 1; (this as any)._done = true; this.cdr.detectChanges(); },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Code expiré. Recommencez depuis le début.';
        this.cdr.detectChanges();
      }
    });
  }

  get done() { return (this as any)._done === true; }

  resendOtp() {
    this.otpDigits = ['', '', '', '', '', ''];
    this.errorMessage = '';
    this.sendOtp();
  }
}
