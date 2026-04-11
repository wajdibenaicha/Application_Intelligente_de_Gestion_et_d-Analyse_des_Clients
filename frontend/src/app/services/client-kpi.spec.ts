import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { KpiService } from './client-kpi';

describe('KpiService', () => {
  let service: KpiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(KpiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
