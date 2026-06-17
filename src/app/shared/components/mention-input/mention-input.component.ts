import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-mention-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mention-input.component.html',
  styleUrls: ['./mention-input.component.scss']
})
export class MentionInputComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);

  @Input() text = '';
  @Input() multiline = false;
  @Input() placeholder = '';
  @Input() rows = 3;
  @Input() maxlength: number | null = null;
  @Input() name = 'text';
  @Input() variant: 'textarea' | 'inline' = 'inline';

  @Output() textChange = new EventEmitter<string>();
  @Output() enterPressed = new EventEmitter<void>();

  @ViewChild('field') field?: ElementRef<HTMLTextAreaElement | HTMLInputElement>;

  suggestions: User[] = [];
  showSuggestions = false;
  activeIndex = 0;

  private caretPos = 0;

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | HTMLInputElement;
    this.text = target.value;
    this.textChange.emit(this.text);
    this.caretPos = target.selectionStart ?? this.text.length;
    this.updateSuggestions();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.showSuggestions && this.suggestions.length) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.activeIndex = (this.activeIndex + 1) % this.suggestions.length;
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.activeIndex =
          (this.activeIndex - 1 + this.suggestions.length) % this.suggestions.length;
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        this.select(this.suggestions[this.activeIndex]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.showSuggestions = false;
        return;
      }
    }

    if (event.key === 'Enter' && !this.multiline) {
      event.preventDefault();
      this.enterPressed.emit();
    }
  }

  onBlur(): void {
    setTimeout(() => (this.showSuggestions = false), 150);
  }

  select(user: User): void {
    const before = this.text.slice(0, this.caretPos);
    const after = this.text.slice(this.caretPos);
    const replaced = before.replace(/@[A-Za-z0-9_]*$/, '@' + user.username + ' ');
    this.text = replaced + after;
    this.textChange.emit(this.text);
    this.showSuggestions = false;

    const newCaret = replaced.length;
    setTimeout(() => {
      const el = this.field?.nativeElement;
      if (!el) return;
      el.focus();
      el.setSelectionRange(newCaret, newCaret);
      this.caretPos = newCaret;
    }, 0);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.showSuggestions) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.mention-wrap')) {
      this.showSuggestions = false;
    }
  }

  private updateSuggestions(): void {
    const before = this.text.slice(0, this.caretPos);
    const match = before.match(/(^|\s)@([A-Za-z0-9_]*)$/);
    if (!match) {
      this.showSuggestions = false;
      this.suggestions = [];
      return;
    }
    const me = this.auth.currentUser?.username;
    if (!me) {
      this.showSuggestions = false;
      return;
    }
    const query = match[2];
    this.suggestions = this.userService.getMentionSuggestions(me, query);
    this.showSuggestions = this.suggestions.length > 0;
    this.activeIndex = 0;
  }
}
