import { Routes } from '@angular/router';
import { Login } from './login/login';
import { ForgotPassword } from './forgot-password/forgot-password';
import { DashboardGestionnaire } from './dashboard-gestionnaire/dashboard-gestionnaire';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'dashboard-gestionnaire', component: DashboardGestionnaire },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];

