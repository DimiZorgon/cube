// src/App.jsx
// Point d'entrée de l'application : la navigation est entièrement pilotée par l'URL.
// Voir src/router.jsx (table des routes) et src/routes/routeConfig.js (source unique des chemins).
import React from 'react';
import { RouterProvider } from 'react-router';
import './App.css';
import { createAppRouter } from './router';

const router = createAppRouter();

export default function App() {
  return <RouterProvider router={router} />;
}
