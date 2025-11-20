import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private _count = 0;
  private _visible$ = new BehaviorSubject<boolean>(false);
  visible$ = this._visible$.asObservable();

  show() {
    this._count++;
    if (this._count === 1) this._visible$.next(true);
  }

  hide() {
    if (this._count > 0) this._count--;
    if (this._count === 0) this._visible$.next(false);
  }

  /** Pour entourer une promesse facilement */
  async wrap<T>(p: Promise<T>): Promise<T> {
    this.show();
    try { return await p; }
    finally { this.hide(); }
  }
}
