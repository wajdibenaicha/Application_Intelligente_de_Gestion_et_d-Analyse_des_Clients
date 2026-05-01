import { Routes } from '@angular/router';
import { Login } from './login/login';
import { ForgotPassword } from './forgot-password/forgot-password';
import { DashboardGestionnaire } from './dashboard-gestionnaire/dashboard-gestionnaire';
import { DashbordAdmin } from './features/admin/dashbord-admin/dashbord-admin';
import { FillQuestionnaireComponent } from './components/fill-questionnaire/fill-questionnaire';
import { RepondreQuestionnaire } from './repondre-questionnaire/repondre-questionnaire';
import { adminGuard, gestionnaireGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'dashboard-gestionnaire', component: DashboardGestionnaire, canActivate: [gestionnaireGuard] },
  { path: 'dashbord-admin', component: DashbordAdmin, canActivate: [adminGuard] },
  { path: 'repondre', component: RepondreQuestionnaire },
  { path: 'fill-questionnaire', component: FillQuestionnaireComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
 