// src/pages/MethodRoute.jsx — /algos/:size/:method[/:section]
import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { METHOD_VIEWS } from './lazyViews';
import { NotFoundPage } from './NotFoundPage';
import { findMethod, paths, sectionById, sectionBySlug } from '../routes/routeConfig';
import { useSeo } from '../routes/useSeo';

function seoKeyFor(method, section, sectionSlug) {
  if (!method) return 'notFound';
  if (section) return `method.${method.key}.${section.slug}`;
  return sectionSlug ? 'notFound' : `method.${method.key}`;
}

export function MethodRoute() {
  const { size, method: methodSlug, section: sectionSlug } = useParams();
  const navigate = useNavigate();
  const method = findMethod(size, methodSlug);
  const section = sectionSlug ? sectionBySlug(method, sectionSlug) : null;
  useSeo(seoKeyFor(method, section, sectionSlug));

  if (!method) return <NotFoundPage />;

  // Section inconnue, ou méthode à onglets sans section → onglet par défaut (ou vue « Tout »).
  if ((sectionSlug && !section) || (!sectionSlug && method.defaultSection)) {
    return <Navigate to={paths.method(method, method.defaultSection)} replace />;
  }

  const View = METHOD_VIEWS[method.key];
  const sectionProps =
    method.sections.length > 0
      ? {
          activeSection: section?.id ?? method.allSectionId,
          onSectionChange: id => navigate(paths.method(method, sectionById(method, id)?.slug))
        }
      : {};

  return (
    <View
      {...sectionProps}
      onBack={() => navigate(paths.algos())}
      onTestAlgo={caseData =>
        navigate(paths.training(method, caseData.id), {
          state: { fromSection: section?.slug ?? null }
        })
      }
    />
  );
}

