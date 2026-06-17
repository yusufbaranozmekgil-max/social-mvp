import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private subject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.subject.asObservable();

  show(message: string, type: ToastType = 'success', durationMs = 3500): void {
    const toast: Toast = {
      id: crypto.randomUUID(),
      type,
      message
    };
    this.subject.next([...this.subject.value, toast]);
    setTimeout(() => this.dismiss(toast.id), durationMs);
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error', 5000); }
  info(message: string): void { this.show(message, 'info'); }

  dismiss(id: string): void {
    this.subject.next(this.subject.value.filter(t => t.id !== id));
  }
}
