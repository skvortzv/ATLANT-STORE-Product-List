import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceProductListComponent } from './service-product-list.component';
import { TuiButtonModule, TuiDropdownModule, TuiHintModule, TuiLoaderModule, TuiSvgModule, TuiTextfieldControllerModule } from '@taiga-ui/core';
import { MicroserviceProductViewModule } from 'src/microservices/microservice-product-view/microservice-product-view.module';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TuiInputNumberModule } from '@taiga-ui/kit';
import { LAZYLOAD_IMAGE_HOOKS, LazyLoadImageModule, ScrollHooks } from 'ng-lazyload-image';

@NgModule({
  declarations: [
    ServiceProductListComponent
  ],
  imports: [
    CommonModule,
    TuiSvgModule,
    TuiLoaderModule,
    MicroserviceProductViewModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    TuiInputNumberModule,
    TuiTextfieldControllerModule,
    TuiHintModule,
    TuiDropdownModule,
    TuiButtonModule,
    LazyLoadImageModule
  ],
  providers: [{ provide: LAZYLOAD_IMAGE_HOOKS, useClass: ScrollHooks }],
  exports: [
    ServiceProductListComponent
  ]
})
export class ServiceProductListModule {}
