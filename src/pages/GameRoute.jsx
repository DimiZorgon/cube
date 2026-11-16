// src/pages/GameRoute.jsx — /play/:size
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { GAME_VIEWS } from './lazyViews';
import { NotFoundPage } from './NotFoundPage';
import { paths } from '../routes/routeConfig';
import { useSeo } from '../routes/useSeo';

export function GameRoute() {
  const { size } = useParams();
  const navigate = useNavigate();
  const View = GAME_VIEWS[size];
  useSeo(View ? `game.${size}` : 'notFound');

  if (!View) return <NotFoundPage />;
  return <View onBack={() => navigate(paths.play())} />;
}

