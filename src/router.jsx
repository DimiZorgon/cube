// src/router.jsx
// Table de routage. Les chemins sont relatifs au basename de langue ('' pour FR, '/en' pour EN).
import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from './pages/RootLayout';
import { HomePage } from './pages/HomePage';
import { PlayMenuPage } from './pages/PlayMenuPage';
import { AlgosMenuPage } from './pages/AlgosMenuPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { GameRoute } from './pages/GameRoute';
import { MethodRoute } from './pages/MethodRoute';
import { TimerRoute, SettingsRoute } from './pages/ToolRoutes';
import { TrainingRoute, SmartCubePage } from './pages/lazyViews';
import { SmartCubeAlgoTestPage } from './pages/SmartCubeAlgoTestPage';
import { basenameFor, detectLang, paths } from './routes/routeConfig';

export const routes = [
  {
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'play', element: <PlayMenuPage /> },
      { path: 'play/smart-cube', element: <SmartCubePage /> },
      { path: 'play/:size', element: <GameRoute /> },
      { path: 'timer', element: <TimerRoute /> },
      { path: 'settings', element: <SettingsRoute /> },
      { path: 'algos', element: <AlgosMenuPage /> },
      { path: 'algos/:size', element: <Navigate to={paths.algos()} replace /> },
      { path: 'algos/:size/:method', element: <MethodRoute /> },
      { path: 'algos/:size/:method/:section', element: <MethodRoute /> },
      { path: 'algos/:size/:method/test/:caseId', element: <TrainingRoute /> },
      { path: 'smart-cube/algo/:caseId', element: <SmartCubeAlgoTestPage /> },
      { path: 'play/smart-cube/algo/:caseId', element: <SmartCubeAlgoTestPage /> },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
];

export function createAppRouter() {
  const lang = detectLang(window.location.pathname);
  return createBrowserRouter(routes, { basename: basenameFor(lang) });
}
