// src/pages/TrainingRoute.jsx — /algos/:size/:method/test/:caseId
// Lance le cube en mode entraînement sur un cas précis (lien partageable, résistant au F5).
import React, { useMemo } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { GAME_VIEWS } from './lazyViews';
import { NotFoundPage } from './NotFoundPage';
import { detectLang, findMethod, paths, sectionById, sectionBySlug } from '../routes/routeConfig';
import { methodName } from '../routes/seo';
import { useSeo } from '../routes/useSeo';
import { findCase } from '../routes/caseLookup';
import { localizeCase } from '../i18n/localizeData';

/**
 * Onglet vers lequel revenir :
 * - navigation interne → l'onglet d'où l'on vient (transmis dans le state, null = vue « Tout ») ;
 * - lien direct → l'onglet auquel appartient le cas.
 */
function resolveBackSection(method, found, state) {
  if (state && 'fromSection' in state) {
    return sectionBySlug(method, state.fromSection)?.slug ?? method.defaultSection ?? null;
  }
  return sectionById(method, found.sectionId)?.slug ?? method.defaultSection ?? null;
}

export function TrainingRoute() {
  const { size, method: methodSlug, caseId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const method = findMethod(size, methodSlug);
  const found = useMemo(() => (method ? findCase(method.key, caseId) : null), [method, caseId]);

  // Objet mémoïsé : CubeGame réinitialise le cube à chaque changement de référence de trainingCase.
  const trainingCase = useMemo(
    () => (found ? { ...localizeCase(found.item, t), size: Number(method.size[0]) } : null),
    [found, method, t]
  );

  useSeo(
    trainingCase ? 'training' : 'notFound',
    trainingCase
      ? {
          caseName: trainingCase.name,
          methodName: methodName(method.key, detectLang(window.location.pathname))
        }
      : undefined
  );

  if (!method) return <NotFoundPage />;
  if (!found) return <Navigate to={paths.method(method, method.defaultSection)} replace />;

  const View = GAME_VIEWS[method.size];
  const backSection = resolveBackSection(method, found, state);

  return (
    <View
      key={caseId}
      trainingCase={trainingCase}
      onBack={() => navigate(paths.method(method, backSection))}
    />
  );
}

