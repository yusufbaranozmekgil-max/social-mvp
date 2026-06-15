import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  email = '';
  password = '';
  error = '';

  onSubmit(): void {
    this.error = '';
    if (!this.username.trim() || !this.email.trim() || !this.password) {
      this.error = 'Tüm alanları doldurun.';
      return;
    }
    if (this.password.length < 4) {
      this.error = 'Şifre en az 4 karakter olmalı.';
      return;
    }

    const result = this.auth.register(
      this.username.trim(),
      this.email.trim(),
      this.password
    );
    if (result.ok) {
      this.router.navigate(['/feed']);
    } else {
      this.error = result.error ?? 'Kayıt başarısız.';
    }
  }
}
