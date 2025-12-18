import { describe, it, expect } from 'vitest';
import { formatDay, formatDateTime, normalizeDateOnly, weekdayLabels } from './date';

describe('date utils', () => {
    describe('formatDay', () => {
        it('formata uma data ISO para dd/MM/yyyy', () => {
            const result = formatDay('2025-12-18T10:30:00.000Z');
            expect(result).toBe('18/12/2025');
        });

        it('formata um objeto Date para dd/MM/yyyy', () => {
            const date = new Date(2025, 11, 25); // 25 Dezembro 2025
            const result = formatDay(date);
            expect(result).toBe('25/12/2025');
        });
    });

    describe('formatDateTime', () => {
        it('formata data e hora por defeito para dd/MM/yyyy HH:mm', () => {
            const date = new Date(2025, 11, 18, 14, 30);
            const result = formatDateTime(date);
            expect(result).toBe('18/12/2025 14:30');
        });

        it('aceita formato personalizado', () => {
            const date = new Date(2025, 11, 18, 14, 30);
            const result = formatDateTime(date, 'HH:mm');
            expect(result).toBe('14:30');
        });

        it('formata apenas dia e mês', () => {
            const date = new Date(2025, 11, 18);
            const result = formatDateTime(date, 'dd/MM');
            expect(result).toBe('18/12');
        });
    });

    describe('normalizeDateOnly', () => {
        it('converte data para formato yyyy-MM-dd', () => {
            const date = new Date(2025, 11, 18, 14, 30);
            const result = normalizeDateOnly(date);
            expect(result).toBe('2025-12-18');
        });

        it('converte string ISO para yyyy-MM-dd', () => {
            const result = normalizeDateOnly('2025-12-18T14:30:00.000Z');
            expect(result).toBe('2025-12-18');
        });
    });

    describe('weekdayLabels', () => {
        it('retorna labels corretos para dias da semana', () => {
            expect(weekdayLabels[0]).toBe('Domingo');
            expect(weekdayLabels[1]).toBe('Segunda');
            expect(weekdayLabels[2]).toBe('Terça');
            expect(weekdayLabels[3]).toBe('Quarta');
            expect(weekdayLabels[4]).toBe('Quinta');
            expect(weekdayLabels[5]).toBe('Sexta');
            expect(weekdayLabels[6]).toBe('Sábado');
        });

        it('contém exatamente 7 dias', () => {
            expect(Object.keys(weekdayLabels)).toHaveLength(7);
        });
    });
});
