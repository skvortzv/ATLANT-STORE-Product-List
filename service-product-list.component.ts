import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FastAverageColor } from 'fast-average-color';
import { ServiceProductListService } from './service-product-list.service';
import { finalize, take } from 'rxjs/operators';
import { GeneralService } from '../general/general.service';
import { Router } from '@angular/router';
import { TuiAlertService } from '@taiga-ui/core';
import { Subscription } from 'rxjs';
import { SessionService } from '../session/session.service';
import { ServiceCartService } from '../service-cart/service-cart.service';
import { ServiceFavoritesService } from '../service-favorites/service-favorites.service';
import { HttpClient } from '@angular/common/http';

type Data = {
  category_id?: string,
  rows: string,
  page: string,
  order?: string,
  currency: string,
  array?: string[],
  request?:  string
};

@Component({
  selector: 'app-service-product-list',
  templateUrl: './service-product-list.component.html',
  styleUrls: ['./service-product-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ServiceProductListComponent implements OnInit, OnDestroy {
  @Output() productsCart = new EventEmitter();

  @Input() header: string | undefined;
  @Input() request: string | undefined;
  @Input() data: Data = { rows: '0', page: '1', currency: 'RUR' };
  @Input() id: string | undefined;
  @Input() startup: boolean = false;
  @Input() isAnyPages: boolean = false;
  @Input() cart: boolean = false;
  @Input() productView: boolean = true;
  @Input() productViewType: string = "full";

  public products: any;
  public onLoaded: boolean = false;
  public pages: number[] = [];
  public currentPage: number = Number(this.data?.page);
  public totalPages: number = 0;
  public isMobile: boolean = Boolean(this._serviceGeneral.device);
  public viewClass: string | undefined;
  public rating: boolean = true;
  public session: boolean = false;
  public value: number = 1;
  private _parent: HTMLElement | undefined;
  private _endPage: any;
  private _doMobileUploading: boolean = true;
  private _subscriptions: Subscription[] = [];

  constructor(
    private _service: ServiceProductListService, 
    private _serviceGeneral: GeneralService, 
    private _router: Router, 
    @Inject(TuiAlertService) private readonly alerts: TuiAlertService,
    private _serviceSession: SessionService,
    private _serviceCart: ServiceCartService,
    private _serviceFavorites: ServiceFavoritesService,
    private _httpClient: HttpClient,
    private _changeDetectorRef: ChangeDetectorRef
  ) {
    /* Присвивание stream-сессии */
    const subscriptionGetSession = this._serviceSession.$session.subscribe((response: any) => {
      this.session = response;
    });
    this._subscriptions.push(subscriptionGetSession);

    /* Прослушивание новых параметров товара */
    const subscriptionGetOptions = this._service.$options.subscribe((response: any) => {
      this.products.find((product: any) => product.id == response.id).options = [];

      response.content.forEach((option: any) => {
        const params = { id: option.id, productId: response.id };

        this._service.getOptionInfo(params);
      });
    });
    this._subscriptions.push(subscriptionGetOptions);

    /* Прослушивание полной информации параметров товара */
    const subscriptionGetOptionInfo = this._service.$optionInfo.subscribe((response: any) => {
      this.products.find((product: any) => product.id == response.id).options ? this.products.find((product: any) => product.id == response.id).options : new Array();

      if (!this.products.find((product: any) => product.id == response.id).options?.some((element: any) => element?.id == response.content.id)) {
        this.products.find((product: any) => product.id == response.id).options?.push(response.content);

        _changeDetectorRef.detectChanges();
      }
    });
    this._subscriptions.push(subscriptionGetOptionInfo);
  }

  trackByFn(index: any, item: any) {
    return item.id;
  }

  public setAverageColor(id: string, url: string): void {
    const fastAverageColor = new FastAverageColor();
    
    fastAverageColor.getColorAsync(url, { algorithm: 'dominant', ignoredColor: [
      [255, 255, 255, 255, 150]
    ] })
    .then(color => {
      this.products.find((product: any) => product.id == id).dominant_color = color.hex;

      this._changeDetectorRef.detectChanges();
    })
    .catch(error => {
      console.log(error);
    });
  }

  public selectedPage(page: number): void {
    this.currentPage = page;
    this.data.page = String(this.currentPage);
    this.onLoaded = false;

    this.download();
    this.addSectionPages(this.isMobile, this.totalPages);

    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth"
      });
    }, 500);
  }

  public changeName(name: string): any {
    let nameLatin = name.toLowerCase().replaceAll(':', '').replaceAll(' ', '-').replaceAll('  ', '-').replaceAll("'", '').replaceAll(".", '');

    return nameLatin;
  }

  public setInfoSplit(info: string): string {
    let infoSplit = info.split("<br />").join("");    
    infoSplit = infoSplit.split("<br>").join(" ");

    return infoSplit;
  }

  public getSteamPrice(info: string): string {
    let infoSplit = info.split("<br />");
    infoSplit = infoSplit.filter((element: any) => element !== "");

    let price = "";
    for (let i = 0; i < infoSplit.length; ++i) {
      if (infoSplit[i].indexOf("Цена в Steam: ") == 0) {
        price = infoSplit[i].replace(/Цена в Steam: /g, '');
        price = price.charAt(0).toUpperCase() + price.slice(1);
        price = price.replace(/рублей/g, '');
      }
    }

    if (price == "Недоступна") {
      price = "";
    }

    return price;
  }

  public download(): void {
    if (this.request) {
      const subscriptionDownload = this.send(this.request, this.data).pipe(
        take(1),
        finalize(() => {
          this.onLoaded = true;
          this._doMobileUploading = true;
          this._endPage = <HTMLElement>document.getElementById("pages");

          if (this.isAnyPages) {
            this.addSectionPages(this.isMobile, this.totalPages);
          }
        })
      )
      .subscribe((response: any) => {
        if (this.request == "from-array") {
          this.products = [];

          let array = this.data.array;

          array?.forEach((valueArray: string) => {
            response.product.forEach((valueProduct: any) => {
              if (valueProduct.id == valueArray) {
                this._service.productDescription(valueProduct.id).pipe(take(1)).subscribe((response: any) => {
                  if (!this.products.some((product: any) => product.id === valueProduct.id)) {
                    valueProduct.price_steam = this.getSteamPrice(response.product.info);

                    this.products.push(valueProduct);

                    this.send('product-description', valueProduct.id).pipe(take(1)).subscribe((response: any) => {
                      if (response.product.preview_imgs) {
                        if (response.product.preview_imgs[0]) {
                          this.setAverageColor(valueProduct.id, response.product?.preview_imgs[0]?.url);
                        }
                      }
                    });
  
                    const params = { id: valueProduct.id };
                    this._service.getOptionsList(params);
  
                    this._changeDetectorRef.detectChanges();
                  }
                });
              }
            });
          });

          if (this.cart) {
            this.productsCart.emit(this.products);
            this._changeDetectorRef.detectChanges();
          }
        }
        else if (this.request == "request") {
          this.products = [];

          let request = this.data.request?.replaceAll(',', ' ')?.replaceAll(':', ' ')?.replaceAll('.', ' ')?.replaceAll('|', ' ')?.replaceAll('/', ' ')?.replaceAll(';', ' ');
          
          let requestArray;
          if (request?.includes(' ')) {
            requestArray = request?.split(' ');
          }

          if (Array.isArray(requestArray)) {
            requestArray.forEach(() => {
              response.product.forEach((element: any) => {
                if (element.name.toLowerCase() === this.data.request?.toLowerCase() || element.name.toLowerCase() === this.latinization(this.data.request?.toLowerCase())) {
                  this._service.productDescription(element.id).pipe(take(1)).subscribe((response: any) => {
                    element.price_steam = this.getSteamPrice(response.product.info);

                    if (!this.products.some((product: any) => product.id === element.id)) {
                      this.products.push(element);

                      this.send('product-description', element.id).pipe(take(1)).subscribe((response: any) => {
                        if (response.product.name.toLowerCase().includes("аренда") && (response.product.name.toLowerCase().includes("rust") || response.product.name.toLowerCase().includes("dayz") || response.product.name.toLowerCase().includes("counter-strike 2"))) {
                          this.products.find((e: any) => e.id == element.id).rent = true;

                          this._changeDetectorRef.detectChanges();
                        }
          
                        if (response.product.preview_imgs) {
                          if (response.product.preview_imgs[0]) {
                            this.setAverageColor(element.id, response.product?.preview_imgs[0]?.url);
                          }
                        }
                      });
                    }

                    this._changeDetectorRef.detectChanges();
                  });
                }
              });
            });

            requestArray.forEach((string: any) => {
              response.product.forEach((element: any) => {
                if (element.name.toLowerCase().includes(string?.toLowerCase()) || element.name.toLowerCase().includes(this.latinization(string?.toLowerCase()))) {
                  this._service.productDescription(element.id).pipe(take(1)).subscribe((response: any) => {
                    element.price_steam = this.getSteamPrice(response.product.info);

                    if (!this.products.some((product: any) => product.id === element.id)) {
                      this.products.push(element);

                      this.send('product-description', element.id).pipe(take(1)).subscribe((response: any) => {
                        if (response.product.name.toLowerCase().includes("аренда") && (response.product.name.toLowerCase().includes("rust") || response.product.name.toLowerCase().includes("dayz") || response.product.name.toLowerCase().includes("counter-strike 2"))) {
                          this.products.find((e: any) => e.id == element.id).rent = true;

                          this._changeDetectorRef.detectChanges();
                        }
          
                        if (response.product.preview_imgs) {
                          if (response.product.preview_imgs[0]) {
                            this.setAverageColor(element.id, response.product?.preview_imgs[0]?.url);
                          }
                        }
                      });
                    }

                    this._changeDetectorRef.detectChanges();
                  });
                }
              });
            });
          }
          else {
            response.product.forEach((element: any) => {
              if (element.name.toLowerCase().includes(request?.toLowerCase()) || element.name.toLowerCase().includes(this.latinization(request?.toLowerCase()))) {
                this._service.productDescription(element.id).pipe(take(1)).subscribe((response: any) => {
                  element.price_steam = this.getSteamPrice(response.product.info);

                  if (!this.products.some((product: any) => product.id === element.id)) {
                    this.products.push(element);

                    this.send('product-description', element.id).pipe(take(1)).subscribe((response: any) => {
                      if (response.product.name.toLowerCase().includes("аренда") && (response.product.name.toLowerCase().includes("rust") || response.product.name.toLowerCase().includes("dayz") || response.product.name.toLowerCase().includes("counter-strike 2"))) {
                        this.products.find((e: any) => e.id == element.id).rent = true;

                        this._changeDetectorRef.detectChanges();
                      }
        
                      if (response.product.preview_imgs) {
                        if (response.product.preview_imgs[0]) {
                          this.setAverageColor(element.id, response.product?.preview_imgs[0]?.url);
                        }
                      }
                    });
                  }

                  this._changeDetectorRef.detectChanges();
                });
              }
            });
          }

          this._changeDetectorRef.detectChanges();
        }
        else {
          this.products = response.product;

          this.products.forEach((product: any) => {
            this._service.productDescription(product.id).pipe(take(1)).subscribe((response: any) => {
              this.products.find((element: any) => element.id === product.id).price_steam = this.getSteamPrice(response.product.info);

              this._changeDetectorRef.detectChanges();
            });
          });

          this.totalPages = response.totalPages;
          
          this.onLoaded = true;
          this._doMobileUploading = true;
          this._endPage = <HTMLElement>document.getElementById("pages");

          this._changeDetectorRef.detectChanges();
        }

        if (this.products) {
          this.products.forEach((product: any) => {
            this.send('product-description', product.id).pipe(take(1)).subscribe((response: any) => {
              if (response.product.name.toLowerCase().includes("аренда") && (response.product.name.toLowerCase().includes("rust") || response.product.name.toLowerCase().includes("dayz") || response.product.name.toLowerCase().includes("counter-strike 2"))) {
                this.products.find((element: any) => element.id == product.id).rent = true;

                this._changeDetectorRef.detectChanges();
              }

              if (response.product.preview_imgs) {
                if (response.product.preview_imgs[0]) {
                  this.setAverageColor(product.id, response.product?.preview_imgs[0]?.url);
                }
              }
            });
          });
        } 
      });
      this._subscriptions.push(subscriptionDownload);
    }

    const subscriptionGetSessionExperience = this._serviceGeneral.getSession("experience").pipe(take(1)).subscribe((response: any) => {
      if (response) {
        if (response.value >= 1000) {
          this.rating = false;
        }
      }
    });
    this._subscriptions.push(subscriptionGetSessionExperience);
  }

  public action(type: string, productId: string) {
    if (type == "favorite") {
      if (this.session) {
        this._serviceGeneral.pushCookie("favorite", productId);

        this.alerts.open(`Товар успешно добавлен в Избранные!`, { label: "Успешно!", status: "success", autoClose: true }).subscribe();
      }
      else {
        this.alerts.open(`Чтобы пользоваться сервисом "Избранное" - нужно быть зарегистрированным!`, { label: "Инфо", autoClose: true }).subscribe();

        this._router.navigate(["/auth"]);
      }
    }
    else if (type == "favorite-remove") {
      if (this.session) {
        this._serviceGeneral.removeCookie("favorite", productId);
        this._serviceFavorites.refreshFavorites();

        this.alerts.open(`Товар удален из списка Избранныx!`, { label: "Инфо", autoClose: true }).subscribe();
      }
      else {
        this.alerts.open(`Чтобы пользоваться сервисом "Избранное" - нужно быть зарегистрированным!`, { label: "Инфо", autoClose: true }).subscribe();

        this._router.navigate(["/auth"]);
      }
    }
    else if (type == "cart") {
      this._serviceGeneral.pushCookie("cart", productId);

      this.alerts.open(`Товар успешно добавлен в Корзину!`, { label: "Успешно!", status: "success", autoClose: true }).subscribe();
    }
    else if (type == "cart-remove") {
      this._serviceGeneral.removeCookie("cart", productId);
      this._serviceCart.refreshCart();

      this.alerts.open(`Товар удален из Корзины!`, { label: "Инфо", autoClose: true }).subscribe();
    }
  }

  public isFavorite(productId: string): boolean {
    return this._serviceGeneral.includesCookie("favorite", productId);
  }

  public isCart(productId: string): boolean {
    return this._serviceGeneral.includesCookie("cart", productId);
  }

  public setCount(productId: string, value: any): void {
    this.products.forEach((product: any) => {
      if (product.id == productId) {
        this.products.find((product: any) => product.id == productId).count = value.target.value;
      }
    });
  }

  public onNotify(): void {
    const form: HTMLFormElement = <HTMLFormElement>document.getElementById('digiselller_form');

    form.submit();
  }

  private send(request: string, data: any): any {
    if (request == 'from-category') {
      return this._service.fromCategory(data ? data : console.log("Ошибка! Переменная 'data' пуста."));
    } else if (request == 'product-description') {
      return this._service.productDescription(data ? data : console.log("Ошибка! Отсутсвует переменная 'data:id' для получения полного описания товара."));
    } else if (request == 'from-array') {
      return this._service.fromCategory(data ? data : console.log("Ошибка! Переменная 'data' пуста."));
    } else if (request == 'request') {
      return this._service.fromCategory(data ? data : console.log("Ошибка! Переменная 'data' пуста."));
    }
  }

  public load(): any {
    if (this.request) {
      const subscriptionLoad = this.send(this.request, this.data).pipe(
        take(1),
        finalize(() => {
          this._doMobileUploading = true;
          this.onLoaded = true;

          if (this.isAnyPages) {
            this.addSectionPages(this.isMobile, this.totalPages);
          }
        })
      )
      .subscribe((response: any) => {
        this.products?.push?.apply(this.products, response.product);

        this.products?.forEach((product: any) => {
          this.send('product-description', product.id).pipe(take(1)).subscribe((response: any) => {
            if (response.product?.preview_imgs) {
              this.setAverageColor(product.id, response.product.preview_imgs[0].url);
            }
          });
        });
      });
      this._subscriptions.push(subscriptionLoad);
    }
  }

  public onSelectOption(product: any, optionID: any, variantID: any, text: any): void {
    const params = { product, optionID, variantID };

    this._serviceCart.setOption(params);

    const select: HTMLElement = <HTMLElement>document.getElementById(`option-select-${ optionID }`);
    select.innerHTML = text;
  }

  private addSectionPages(type: boolean, totalPages: any): void {
    if (!type) {
      this.pages = [];

      let oneTimeCondition = false;
      for (let i = this.currentPage; i <= totalPages; ++i) {
        if (this.currentPage == 2 && !oneTimeCondition) {
          this.pages.push(i - 1);
          this.pages.push(i);
  
          oneTimeCondition = !oneTimeCondition;
  
          continue;
        }
        
        if (this.currentPage > 2 && !oneTimeCondition) {
          this.pages.push(i - 2);
          this.pages.push(i - 1);
          this.pages.push(i);
  
          oneTimeCondition = !oneTimeCondition;
  
          continue;
        }
  
        this.pages.push(i);
      }
      this._changeDetectorRef.detectChanges();
    }
  }

  private latinization(value: any): string {
    const ru = ['а', 'б', 'ц', 'д', 'е', 'ф', 'г', 'х', 'и', 'ж', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'в', 'з'];
    const en = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'z'];

    let latinization = '';

    for (let i = 0; i < value.length; i++) {
      let index = ru.findIndex((ru: any) => ru === value[i]);

      if (index === -1) {
        latinization += value[i];
      }
      else {
        latinization += en[index];
      }
    }

    return latinization;
  }

  ngOnChanges() {
    if (this.request == "request") {
      if (this.startup) {
        this.download();
      }
    }
    else if (this.request == "from-array") {
      if (this.startup) {
        this.download();
      }
    }
  }

  ngOnInit(): void {
    this._parent = <HTMLElement>document.getElementById(this.id ? this.id : "product-list");

    if (this.startup) {
      this.download();
    }

    addEventListener("scroll", () => {
      if (this._parent && this._parent?.getBoundingClientRect().y < (window.innerHeight - 100) && !this.onLoaded && !this.startup) {
        this.download();
      }

      if (this.isAnyPages && this.isMobile && this._doMobileUploading) {
        if (this._endPage.getBoundingClientRect().y - window.innerHeight < 0) {
          this._doMobileUploading = false;

          if (this.currentPage != this.totalPages) {
            ++this.currentPage;
            this.data.page = String(this.currentPage);
            this.onLoaded = false;

            this.load();
          }
        }
      } 
    });

    this.viewClass = this.productViewType;
  }

  ngOnDestroy(): void {
    /* Отписка от всех прослушиваний */
    this._subscriptions.forEach((subscription: any) => {
      subscription.unsubscribe();
    });
  }
}
