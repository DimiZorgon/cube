// src/utils/timerUtils.js

// Formatage du temps en secondes ou MM:SS.cc (style csTimer)
export function formatTimerValue(ms, penalty = null) {
  if (penalty === 'DNF') return 'DNF';
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '-';

  const effectiveMs = penalty === '+2' ? ms + 2000 : ms;
  const totalSeconds = Math.floor(effectiveMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((effectiveMs % 1000) / 10)
    .toString()
    .padStart(2, '0');

  const formatted =
    minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, '0')}.${centis}`
      : `${seconds}.${centis}`;

  return penalty === '+2' ? `${formatted}+` : formatted;
}

