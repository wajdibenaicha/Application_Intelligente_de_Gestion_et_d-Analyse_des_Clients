import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashbordAdmin } from './dashbord-admin';

describe('DashbordAdmin', () => {
  let component: DashbordAdmin;
  let fixture: ComponentFixture<DashbordAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashbordAdmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashbordAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
