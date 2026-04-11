import { Injectable, NgZone } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private stompClient!: Client;

  notifications$ = new Subject<string>();
  questionnaires$ = new Subject<any[]>();
  gestionnaires$ = new Subject<any[]>();
  question$ = new Subject<any[]>();
  role$ = new Subject<any[]>();
  permission$ = new Subject<any[]>();
  offre$ = new Subject<any[]>();
  adminNotifications$ = new Subject<any[]>();
  recommendations$ = new Subject<any>();

  constructor(private ngZone: NgZone) {}

  connect() {
    if (this.stompClient?.active) return;

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8081/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        this.stompClient.subscribe('/topic/notifications', (message) => {
          this.ngZone.run(() => this.notifications$.next(message.body));
        });
        this.stompClient.subscribe('/topic/questionnaires', (message) => {
          this.ngZone.run(() => this.questionnaires$.next(JSON.parse(message.body)));
        });
        this.stompClient.subscribe('/topic/questions', (message) => {
          this.ngZone.run(() => this.question$.next(JSON.parse(message.body)));
        });
        this.stompClient.subscribe('/topic/roles', (message) => {
          this.ngZone.run(() => this.role$.next(JSON.parse(message.body)));
        });
        this.stompClient.subscribe('/topic/permissions', (message) => {
          this.ngZone.run(() => this.permission$.next(JSON.parse(message.body)));
        });
        this.stompClient.subscribe('/topic/offres', (message) => {
          this.ngZone.run(() => this.offre$.next(JSON.parse(message.body)));
        });
        this.stompClient.subscribe('/topic/gestionnaires', (message) => {
          this.ngZone.run(() => this.gestionnaires$.next(JSON.parse(message.body)));
        });
        this.stompClient.subscribe('/topic/admin/notifications', (message) => {
          this.ngZone.run(() => this.adminNotifications$.next(JSON.parse(message.body)));
        });
        this.stompClient.subscribe('/topic/recommendations', (message) => {
          this.ngZone.run(() => this.recommendations$.next(JSON.parse(message.body)));
        });
      }
    });

    this.stompClient.activate();
  }

  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
  }
}