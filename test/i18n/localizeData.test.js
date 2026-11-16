// Fonctions Vitest :
// - describe : regroupe plusieurs tests liés (un module ou une fonction)
// - it : déclare un cas de test unitaire indépendant
// - expect : vérifie qu'une valeur obtenue correspond à ce qui est attendu
// - vi : boîte à outils de mock/espionnage (ici vi.fn() pour tracer les appels)
import { describe, it, expect, vi } from 'vitest';
import {
  localizeCase,
  localizeCases,
  localizeGroups,
  localizeCFOPGroups,
  localizeSteps,
} from '../../src/i18n/localizeData.js';

// Fausse fonction de traduction `t(clé)` (remplace i18next en test unitaire).
// On préfixe la clé par "tr:" pour prouver que la fonction testée a bien appelé `t(clé)`
// et n'a pas juste recopié le texte d'origine (ex: "Dot" -> "tr:data.case.oll-1.name").
const mockT = (key) => `tr:${key}`;

describe('localizeData', () => {
  // --- 1. localizeCase(item, t) ---
  // Dans l'appli, un `item` représente un cas d'algo (ex: un OLL, PLL, F2L, Blind).
  // `localizeCase` doit traduire uniquement les champs textuels connus :
  // ['name', 'category', 'description', 'face', 'pos', 'note']
  // en construisant la clé `data.case.<item.id>.<champ>`.
  describe('localizeCase', () => {
    it('traduit uniquement les champs string présents et conserve les autres propriétés', () => {
      // Arrange (préparation) : un cas complet avec des champs traduisibles + des champs techniques (alg, level)
      const item = {
        id: 'oll-1',
        name: 'Dot',
        category: 'Dots',
        description: 'Desc',
        face: 'U',
        pos: 'top',
        note: 'Note',
        alg: "R U R'", // Ne doit PAS être traduit (c'est une formule de cube)
        level: 2,      // Ne doit PAS être traduit (c'est un nombre)
      };

      // Act (action) : exécution de la fonction à tester
      const result = localizeCase(item, mockT);

      // Assert (vérification) :
      // `toEqual` compare le contenu complet de l'objet (propriété par propriété)
      expect(result).toEqual({
        id: 'oll-1',
        name: 'tr:data.case.oll-1.name',
        category: 'tr:data.case.oll-1.category',
        description: 'tr:data.case.oll-1.description',
        face: 'tr:data.case.oll-1.face',
        pos: 'tr:data.case.oll-1.pos',
        note: 'tr:data.case.oll-1.note',
        alg: "R U R'",
        level: 2,
      });

      // `not.toBe` compare la référence mémoire : vérifie qu'un NOUVEL objet a été retourné
      // et que `item` d'origine n'a pas été modifié (immutabilité).
      expect(result).not.toBe(item);
      expect(item.name).toBe('Dot');
    });

    it('ignore les champs absents ou non-string', () => {
      // `vi.fn(mockT)` crée un espion autour de `mockT` : il se comporte pareil,
      // mais enregistre combien de fois et avec quels arguments il a été appelé.
      const t = vi.fn(mockT);
      const item = { id: 'c1', name: 'Case 1', note: null, face: 42 };

      const result = localizeCase(item, t);

      expect(result).toEqual({
        id: 'c1',
        name: 'tr:data.case.c1.name',
        note: null, // null n'est pas un string -> conservé tel quel
        face: 42,   // number n'est pas un string -> conservé tel quel
      });

      // On vérifie que `t` n'a été appelé qu'une seule fois (uniquement pour `name`)
      expect(t).toHaveBeenCalledTimes(1);
      expect(t).toHaveBeenCalledWith('data.case.c1.name');
    });
  });

  // --- 2. localizeCases(items, t) ---
  // Applique `localizeCase` à tout un tableau de cas.
  describe('localizeCases', () => {
    it('localise une liste de cas et gère un tableau vide', () => {
      expect(localizeCases([], mockT)).toEqual([]);
      expect(
        localizeCases([{ id: 'a', name: 'A' }, { id: 'b', description: 'B' }], mockT)
      ).toEqual([
        { id: 'a', name: 'tr:data.case.a.name' },
        { id: 'b', description: 'tr:data.case.b.description' },
      ]);
    });
  });

  // --- 3. localizeGroups(namespace, groups, t) ---
  // Dans l'appli (ex: Ortega, Blind, Yau...), les cas sont rangés par groupes/sections.
  // Clé attendue pour le titre : `data.group.<namespace>.<group.section>.title`
  // Clé attendue pour la description (seulement si elle est non vide) : `data.group.<namespace>.<group.section>.description`
  describe('localizeGroups', () => {
    it('traduit le titre, la description si présente, et les cas du groupe', () => {
      const groups = [
        {
          section: 'edges',
          group: 'Edges',
          description: 'Edge cases',
          cases: [{ id: 'e1', name: 'Edge 1' }],
        },
        {
          section: 'corners',
          group: 'Corners',
          description: '', // Chaîne vide (falsy) -> ne doit PAS appeler `t(...)`
          cases: [],
        },
      ];

      const result = localizeGroups('blind', groups, mockT);

      expect(result).toEqual([
        {
          section: 'edges',
          group: 'tr:data.group.blind.edges.title',
          description: 'tr:data.group.blind.edges.description',
          cases: [{ id: 'e1', name: 'tr:data.case.e1.name' }],
        },
        {
          section: 'corners',
          group: 'tr:data.group.blind.corners.title',
          description: '',
          cases: [],
        },
      ]);
    });
  });

  // --- 4. localizeCFOPGroups(sectionId, groups, t) ---
  // Spécifique à la méthode CFOP (F2L, OLL, PLL) : les groupes n'ont pas de `section`,
  // leur clé de traduction utilise leur position (index 0, 1, ...) dans le tableau :
  // `data.group.cfop.<sectionId>.<index>`.
  describe('localizeCFOPGroups', () => {
    it('traduit chaque groupe CFOP par son index et localise ses cas', () => {
      const groups = [
        { group: 'G0', cases: [{ id: 'f1', name: 'F1' }] },
        { group: 'G1', cases: [] },
      ];

      const result = localizeCFOPGroups('f2l', groups, mockT);

      expect(result).toEqual([
        {
          group: 'tr:data.group.cfop.f2l.0',
          cases: [{ id: 'f1', name: 'tr:data.case.f1.name' }],
        },
        {
          group: 'tr:data.group.cfop.f2l.1',
          cases: [],
        },
      ]);
    });
  });

  // --- 5. localizeSteps(steps, t) ---
  // Dans l'appli, les méthodes débutants (2x2, 3x3, 4x4, 5x5) sont découpées en étapes (`steps`).
  // Chaque étape possède :
  // - `title` -> `data.step.<step.id>.title`
  // - `subtitle` -> `data.step.<step.id>.subtitle`
  // - `explanation` (optionnel, tableau de paragraphes) -> `data.step.<step.id>.explanation.<index>`
  // - `content` (optionnel, tableau de blocs) -> `data.step.<step.id>.content.<index>`
  // - `cases` (optionnel, défaut `[]`) -> localisés via `localizeCases`
  describe('localizeSteps', () => {
    it('traduit title, subtitle, explanation, content et cases', () => {
      const steps = [
        {
          id: 'cross',
          title: 'Cross',
          subtitle: 'White cross',
          explanation: ['line 0', 'line 1'],
          content: ['c0'],
          cases: [{ id: 's1', name: 'S1' }],
        },
      ];

      const result = localizeSteps(steps, mockT);

      // Avec `mockT`, chaque champ reçoit `tr:` + la clé exacte générée par `localizeSteps`.
      // Par exemple pour `subtitle` avec `step.id = 'cross'`, `localizeSteps` appelle
      // `t('data.step.cross.subtitle')`, donc `mockT` retourne `'tr:data.step.cross.subtitle'`.
      expect(result).toEqual([
        {
          id: 'cross',
          title: 'tr:data.step.cross.title',
          subtitle: 'tr:data.step.cross.subtitle',
          explanation: [
            'tr:data.step.cross.explanation.0',
            'tr:data.step.cross.explanation.1',
          ],
          content: ['tr:data.step.cross.content.0'],
          cases: [{ id: 's1', name: 'tr:data.case.s1.name' }],
        },
      ]);
    });

    it('gère les étapes sans explanation, content ou cases', () => {
      // Cas limite : étape minimale sans tableaux optionnels
      const steps = [{ id: 'intro', title: 'Intro', subtitle: 'Sub' }];

      const result = localizeSteps(steps, mockT);

      expect(result).toEqual([
        {
          id: 'intro',
          title: 'tr:data.step.intro.title',
          subtitle: 'tr:data.step.intro.subtitle',
          explanation: undefined,
          content: undefined,
          cases: [], // `step.cases || []` dans localizeSteps renvoie un tableau vide
        },
      ]);
    });
  });
});
