import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Login } from './login';

/*import monLogo from 'src/assets/images/LOGO-STAR-Assurances_page-0001.jpg';*/
describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });




});