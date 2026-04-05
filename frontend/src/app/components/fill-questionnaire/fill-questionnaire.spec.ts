import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FillQuestionnaire } from './fill-questionnaire';

describe('FillQuestionnaire', () => {
  let component: FillQuestionnaire;
  let fixture: ComponentFixture<FillQuestionnaire>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FillQuestionnaire]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FillQuestionnaire);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
