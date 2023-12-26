import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceProductListComponent } from './service-product-list.component';

describe('ServiceProductListComponent', () => {
  let component: ServiceProductListComponent;
  let fixture: ComponentFixture<ServiceProductListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ServiceProductListComponent]
    });
    fixture = TestBed.createComponent(ServiceProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
