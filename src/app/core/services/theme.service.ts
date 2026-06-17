import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';
const THEME_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private subject = new BehaviorSubject<Theme>(this.readInitial());
  theme$ = this.subject.asObservable();

  constructor() {
    this.apply(this.subject.value);
  }

  get current(): Theme {
    return this.subject.value;
  }

  set(theme: Theme): void {
    localStorage.setItem(THEME_KEY, theme);
    this.subject.next(theme);
    this.apply(theme);
  }

  toggle(): void {
    this.set(this.current === 'dark' ? 'light' : 'dark');
  }

  private readInitial(): Theme {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  }

  private apply(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
