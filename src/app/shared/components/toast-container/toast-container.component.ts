import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastType } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss']
})
export class ToastContainerComponent {
  private service = inject(ToastService);

  toasts$ = this.service.toasts$;

  dismiss(id: string): void {
    this.service.dismiss(id);
  }

  iconFor(type: ToastType): string {
    if (type === 'success') return 'check_circle';
    if (type === 'error') return 'error';
    return 'info';
  }
}
