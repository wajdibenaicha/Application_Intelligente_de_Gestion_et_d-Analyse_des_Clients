import { Injectable } from '@angular/core';
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

  connect() {
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8081/ws'),
      onConnect: () => {
        console.log('WebSocket connected!');

        this.stompClient.subscribe('/topic/notifications', (message) => {
          this.notifications$.next(message.body);
        });

        this.stompClient.subscribe('/topic/questionnaires', (message) => {
          this.questionnaires$.next(JSON.parse(message.body));
        });

        this.stompClient.subscribe('/topic/questions', (message) => {
          this.question$.next(JSON.parse(message.body));
        });

        this.stompClient.subscribe('/topic/roles', (message) => {
          this.role$.next(JSON.parse(message.body));
        });

        this.stompClient.subscribe('/topic/permissions', (message) => {
          this.permission$.next(JSON.parse(message.body));
        });

        this.stompClient.subscribe('/topic/offres', (message) => {
          this.offre$.next(JSON.parse(message.body));
        });
        

        this.stompClient.subscribe('/topic/gestionnaires', (message) => {
          this.gestionnaires$.next(JSON.parse(message.body));
        });
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected');
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
