import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const PUBLIC_URLS = [
  '/api/administrateurs/login',
  '/api/gestionnaires/login',
  '/api/password/',
  '/api/envoi/',
  '/api/reponses/repondre',
  '/api/public/',
  '/api/ia/status',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const isPublic = PUBLIC_URLS.some(url => req.url.includes(url));
      if ((err.status === 401 || err.status === 403) && !isPublic) {
        localStorage.clear();
        sessionStorage.clear();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
