import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, Subscription, take } from 'rxjs';
import { GeneralService } from '../general/general.service';

const SELLER_ID: string = "740905";
const API: string = "digiseller";

@Injectable({
  providedIn: 'root'
})
export class ServiceProductListService {
  private _url: string | undefined;
  private _headers: HttpHeaders | undefined;
  private _params: HttpParams | undefined;
  private _options = new Subject<object>();
  public $options = this._options.asObservable();
  private _optionInfo = new Subject<object>();
  public $optionInfo = this._optionInfo.asObservable();
  /* Subscriptions */
  private _subscriptions: Subscription[] = [];

  constructor(
    private _http: HttpClient,
    private _serviceGeneral: GeneralService
  ) {}

  public fromCategory(data: any): Observable<any> {
    if (API == "digiseller") {
      if (data.category_id == "all") {
        this._url = `https://api.digiseller.ru/api/shop/products?seller_id=${ SELLER_ID }&category_id=137522`;
        this._headers = new HttpHeaders({ "Accept": "application/json" });
        this._params = new HttpParams()
        .set('rows', "500");

        return this._http.get(this._url, { headers: this._headers, params: this._params });
      }
      else {
        this._url = `https://api.digiseller.ru/api/shop/products?seller_id=${ SELLER_ID }&category_id=${ data.category_id }`;
        this._headers = new HttpHeaders({ "Accept": "application/json" });
        this._params = new HttpParams()
        .set('seller_id', data.seller_id)
        .set('category_id', data.category_id)
        .set('rows', data.rows)
        .set('currency', data.currency);
    
        if (data.page) {
          this._params = this._params.set('page', data.page);
        }
  
        if (data.order) {
          this._params = this._params.set('order', data.order);
        }

        return this._http.get(this._url, { headers: this._headers, params: this._params });
      }
    } else {
      return new Observable;
    }
  }

  public productDescription(id: string): Observable<any> {
    if (API == "digiseller") {
      this._url = `https://api.digiseller.ru/api/products/${ id }/data`;
      this._headers = new HttpHeaders({ "Accept": "application/json" });

      return this._http.get(this._url, { headers: this._headers });
    } else {
      return new Observable;
    }
  }

  public getOptionsList(args: any): void {
    const subscriptionGetOptionsList = this._http.post(`${ this._serviceGeneral.SERVER }/token`, null).pipe(take(1)).subscribe((response: any) => {
      this._http.get(`https://api.digiseller.ru/api/products/options/list/${ args.id }?token=${ response.token }`).pipe(take(1)).subscribe((response: any) => {
        this._options.next({ id: args.id, content: response.content });
      });
    });
    this._subscriptions.push(subscriptionGetOptionsList);
  }

  public getOptionInfo(args: any): void {
    const subscriptionGetOptionInfo = this._http.post(`${ this._serviceGeneral.SERVER }/token`, null).pipe(take(1)).subscribe((response: any) => {
      this._http.get(`https://api.digiseller.ru/api/products/options/${ args.id }?token=${ response.token }`).pipe(take(1)).subscribe((response: any) => {
        this._optionInfo.next({ id: args.productId, content: response.content });
      });
    });
    this._subscriptions.push(subscriptionGetOptionInfo);
  }

  ngOnDestroy(): void {
    /* Отписка от всех прослушиваний */
    this._subscriptions.forEach((subscription: any) => {
      subscription.unsubscribe();
    });
  }
}
