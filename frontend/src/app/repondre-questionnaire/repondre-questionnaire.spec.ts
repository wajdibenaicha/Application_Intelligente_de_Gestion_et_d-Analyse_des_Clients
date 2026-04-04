import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepondreQuestionnaire } from './repondre-questionnaire';

describe('RepondreQuestionnaire', () => {
  let component: RepondreQuestionnaire;
  let fixture: ComponentFixture<RepondreQuestionnaire>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepondreQuestionnaire]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RepondreQuestionnaire);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
