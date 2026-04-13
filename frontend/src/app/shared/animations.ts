import {
  trigger, transition, style, animate, query, stagger, group
} from '@angular/animations';

export const fadeInUp = trigger('fadeInUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(24px)' }),
    animate('380ms cubic-bezier(0.35, 0, 0.25, 1)',
      style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);

export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms ease-out', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0 }))
  ])
]);

export const scaleIn = trigger('scaleIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.93)' }),
    animate('280ms cubic-bezier(0.35, 0, 0.25, 1)',
      style({ opacity: 1, transform: 'scale(1)' }))
  ]),
  transition(':leave', [
    animate('180ms ease-in', style({ opacity: 0, transform: 'scale(0.96)' }))
  ])
]);

export const slideDown = trigger('slideDown', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-12px)', maxHeight: '0px' }),
    animate('280ms ease-out', style({ opacity: 1, transform: 'translateY(0)', maxHeight: '600px' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-12px)', maxHeight: '0px' }))
  ])
]);

export const slideInRight = trigger('slideInRight', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(30px)' }),
    animate('320ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(30px)' }))
  ])
]);

export const listStagger = trigger('listStagger', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(12px)' }),
      stagger(55, [
        animate('320ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

export const cardStagger = trigger('cardStagger', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(20px)' }),
      stagger(80, [
        animate('400ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

export const routeFade = trigger('routeFade', [
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(16px)' })
    ], { optional: true }),
    query(':leave', [
      animate('180ms ease-in', style({ opacity: 0 }))
    ], { optional: true }),
    query(':enter', [
      animate('320ms 180ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
    ], { optional: true })
  ])
]);
