// src/pages/RootLayout.jsx
import React, { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { useTranslation } from 'react-i18next';

export function PageFallback() {
  const { t } = useTranslation();
  return (
    <div className="main-menu-container">
      <div className="menu-header-block">
        <div className="trainer-progress-pill" style={{ fontSize: '1rem', padding: '0.6rem 1.2rem' }}>
          {t('common.loading')}
        </div>
      </div>
    </div>
  );
}

export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </>
  );
}

