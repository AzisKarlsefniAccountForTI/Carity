
import { SaverName } from './types';

export const TARGET_DATE = new Date('2026-08-29T00:00:00');
export const APP_TITLE = "Misi Menjadi Sigma";
export const APP_SUBTITLE = "Tabungan Donasi Kebaikan Azis & Siska";
export const SAVERS: SaverName[] = ['Azis Khoirul', 'Siska Icha'];
export const STORAGE_KEY = 'sigma_charity_v1';

export const CURRENCY_FORMATTER = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

export const QUICK_AMOUNTS = [25000, 50000, 100000, 500000];
