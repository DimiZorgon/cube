// src/routes/useSeo.js
// Met à jour le <head> (titre, description, canonical, hreflang, OG, robots) à chaque navigation.
// Les balises existent déjà dans le HTML initial (index.html / pages prérendues) :
// on les met à jour en place plutôt que d'en ajouter, pour éviter les doublons.
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { buildHead } from './seo.js';
import { detectLang } from './routeConfig.js';

function upsertMeta(attr, name, content) {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('link');
    document.head.appendChild(el);
  }
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
}

export function applyHead(head) {
  document.documentElement.lang = head.lang;
  document.title = head.title;

  upsertMeta('name', 'description', head.description);
  upsertMeta('name', 'robots', head.robots);
  upsertMeta('property', 'og:title', head.title);
  upsertMeta('property', 'og:description', head.description);
  upsertMeta('property', 'og:url', head.ogUrl);
  upsertMeta('property', 'og:locale', head.ogLocale);
  upsertMeta('name', 'twitter:title', head.title);
  upsertMeta('name', 'twitter:description', head.description);

  upsertLink('link[rel="canonical"]', { rel: 'canonical', href: head.canonical });
  for (const [hreflang, href] of Object.entries(head.alternates)) {
    upsertLink(`link[rel="alternate"][hreflang="${hreflang}"]`, { rel: 'alternate', hreflang, href });
  }
}

/**
 * @param {string} key   clé SEO (voir src/routes/seo.js)
 * @param {object} [vars] variables d'interpolation (ex. { caseName, methodName })
 */
export function useSeo(key, vars) {
  const { pathname } = useLocation();
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const varsKey = JSON.stringify(vars || {});

  useEffect(() => {
    const lang = detectLang(window.location.pathname);
    applyHead(buildHead({ key, lang, path, vars: JSON.parse(varsKey) }));
  }, [key, path, varsKey]);
}
