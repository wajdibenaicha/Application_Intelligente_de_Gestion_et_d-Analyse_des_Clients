import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardGestionnaire } from './dashboard-gestionnaire';

describe('DashboardGestionnaire', () => {
  let component: DashboardGestionnaire;
  let fixture: ComponentFixture<DashboardGestionnaire>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardGestionnaire]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardGestionnaire);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
