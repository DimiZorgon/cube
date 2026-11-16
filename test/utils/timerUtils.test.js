import { describe, it, expect } from 'vitest';
import { formatTimerValue } from '../../src/utils/timerUtils.js';



describe('formatTimerValue', () => {
    it('formatte correctement les valeurs en secondes et centièmes', () => {
        expect(formatTimerValue(12345)).toBe('12.34');
        expect(formatTimerValue(123456)).toBe('2:03.45');
        expect(formatTimerValue(0)).toBe('0.00');
        expect(formatTimerValue(60000)).toBe('1:00.00');
        expect(formatTimerValue(66010)).toBe('1:06.01');
        expect(formatTimerValue(1234567)).toBe('20:34.56');
    });

    it('ajoute un + pour les pénalités de +2 secondes', () => {
        expect(formatTimerValue(12345, '+2')).toBe('14.34+');
        expect(formatTimerValue(123456, '+2')).toBe('2:05.45+');
    });

    it('retourne "DNF" pour les pénalités de DNF', () => {
        expect(formatTimerValue(12345, 'DNF')).toBe('DNF');
        expect(formatTimerValue(123456, 'DNF')).toBe('DNF');
    });

    it('retourne "-" pour les valeurs nulles ou non définies', () => {
        expect(formatTimerValue(null)).toBe('-');
        expect(formatTimerValue(undefined)).toBe('-');
        expect(formatTimerValue(NaN)).toBe('-');
    });

    it('gère les valeurs négatives correctement', () => {
        expect(formatTimerValue(-12345)).toBe('-');
        expect(formatTimerValue(-123456)).toBe('-');
    });
});