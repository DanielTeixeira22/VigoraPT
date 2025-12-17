import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

/**
 * Format a date string to a readable day format
 */
export const formatDay = (date: string | Date): string => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd/MM/yyyy', { locale: pt });
};

/**
 * Format a date string to a readable datetime format
 */
export const formatDateTime = (date: string | Date, formatStr = 'dd/MM/yyyy HH:mm'): string => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, formatStr, { locale: pt });
};

/**
 * Normalize a date to only the date portion (no time)
 */
export const normalizeDateOnly = (date: string | Date): string => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'yyyy-MM-dd');
};

/**
 * Weekday labels for training sessions
 */
export const weekdayLabels: Record<number, string> = {
    0: 'Domingo',
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado',
};
