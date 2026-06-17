import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'naturalTime', standalone: true })
export class NaturalTimePipe implements PipeTransform {
  transform(value: number | Date | string | undefined | null): string {
    if (value == null) return '';
    const past = typeof value === 'number' ? value : new Date(value).getTime();
    if (isNaN(past)) return '';

    const diff = Date.now() - past;
    if (diff < 0) return 'az önce';

    const sec = Math.floor(diff / 1000);
    if (sec < 45) return 'az önce';

    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} dakika önce`;

    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} saat önce`;

    const days = Math.floor(hr / 24);
    if (days === 1) return 'Dün';
    if (days < 7) return `${days} gün önce`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} hafta önce`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} ay önce`;

    const years = Math.floor(days / 365);
    return `${years} yıl önce`;
  }
}
