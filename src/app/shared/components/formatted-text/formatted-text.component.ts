import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type Segment =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string; username: string }
  | { type: 'hashtag'; value: string; tag: string };

@Component({
  selector: 'app-formatted-text',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formatted-text.component.html',
  styleUrls: ['./formatted-text.component.scss']
})
export class FormattedTextComponent implements OnChanges {
  @Input() text = '';

  segments: Segment[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if ('text' in changes) {
      this.segments = this.parse(this.text ?? '');
    }
  }

  private parse(text: string): Segment[] {
    const result: Segment[] = [];
    const regex = /([@#][A-Za-z0-9_]+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', value: text.slice(lastIndex, match.index) });
      }
      const token = match[0];
      if (token.startsWith('@')) {
        result.push({ type: 'mention', value: token, username: token.slice(1) });
      } else {
        result.push({ type: 'hashtag', value: token, tag: token.slice(1) });
      }
      lastIndex = match.index + token.length;
    }
    if (lastIndex < text.length) {
      result.push({ type: 'text', value: text.slice(lastIndex) });
    }
    return result;
  }
}
