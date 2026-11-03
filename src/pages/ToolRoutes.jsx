// src/pages/ToolRoutes.jsx — /timer et /settings
import React from 'react';
import { useNavigate } from 'react-router';
import { SpeedTimer, SettingsPage } from './lazyViews';
import { paths } from '../routes/routeConfig';
import { useSeo } from '../routes/useSeo';

export function TimerRoute() {
  const navigate = useNavigate();
  useSeo('timer');
  return <SpeedTimer onBack={() => navigate(paths.play())} />;
}

export function SettingsRoute() {
  const navigate = useNavigate();
  useSeo('settings');
  return <SettingsPage onBack={() => navigate(paths.home())} />;
}

