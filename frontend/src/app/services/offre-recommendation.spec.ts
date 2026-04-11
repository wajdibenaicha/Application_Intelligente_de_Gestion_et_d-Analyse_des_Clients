import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RecommendationService } from './offre-recommendation';

describe('RecommendationService', () => {
  let service: RecommendationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(RecommendationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
