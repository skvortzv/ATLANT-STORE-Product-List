import { TestBed } from '@angular/core/testing';

import { ServiceProductListService } from './service-product-list.service';

describe('ServiceProductListService', () => {
  let service: ServiceProductListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceProductListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
