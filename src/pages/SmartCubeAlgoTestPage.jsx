// src/pages/SmartCubeAlgoTestPage.jsx
import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SmartCubeAlgoTestView } from '../components/SmartCube/SmartCubeAlgoTestView';
import { NotFoundPage } from './NotFoundPage';
import { findMethod, paths, sectionById, sectionBySlug } from '../routes/routeConfig';
import { findCase } from '../routes/caseLookup';
import { localizeCase } from '../i18n/localizeData';
import { useSeo } from '../routes/useSeo';

function resolveBackSection(method, found, state) {
  if (state && 'fromSection' in state && state.fromSection) {
    return sectionBySlug(method, state.fromSection)?.slug ?? method.defaultSection ?? null;
  }
  return sectionById(method, found?.sectionId)?.slug ?? method.defaultSection ?? null;
}

export function SmartCubeAlgoTestPage() {
  const { caseId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const method = findMethod('3x3', 'cfop');
  const found = useMemo(() => findCase('cfop3x3', caseId), [caseId]);

  const testCase = useMemo(
    () => (found ? { ...localizeCase(found.item, t), size: 3 } : null),
    [found, t]
  );

  useSeo(
    testCase ? 'training' : 'notFound',
    testCase
      ? {
          caseName: testCase.name,
          methodName: 'CFOP 3x3'
        }
      : undefined
  );

  if (!found || !method) {
    return <NotFoundPage />;
  }

  const backSection = resolveBackSection(method, found, state);
  const handleBack = () => {
    navigate(paths.method(method, backSection));
  };

  return (
    <SmartCubeAlgoTestView
      key={caseId}
      caseData={testCase}
      onBack={handleBack}
    />
  );
}

export default SmartCubeAlgoTestPage;
