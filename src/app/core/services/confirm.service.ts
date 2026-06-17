import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private state = new BehaviorSubject<ConfirmRequest | null>(null);
  state$ = this.state.asObservable();
  private resolver?: (value: boolean) => void;

  ask(
    title: string,
    message: string,
    options: { confirmText?: string; cancelText?: string; danger?: boolean } = {}
  ): Promise<boolean> {
    if (this.resolver) {
      this.resolver(false);
      this.resolver = undefined;
    }
    this.state.next({
      title,
      message,
      confirmText: options.confirmText ?? 'Evet',
      cancelText: options.cancelText ?? 'İptal',
      danger: options.danger ?? false
    });
    return new Promise<boolean>(resolve => {
      this.resolver = resolve;
    });
  }

  answer(value: boolean): void {
    this.state.next(null);
    this.resolver?.(value);
    this.resolver = undefined;
  }
}
