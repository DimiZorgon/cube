// scripts/prerender-meta.mjs
// Script post-build :
// 1. Génère un fichier HTML par route indexable (FR et EN) avec <title>, <meta description>,
//    canonical, hreflang et OpenGraph/Twitter pré-remplis pour les moteurs et les aperçus (Discord, X, WhatsApp).
// 2. Génère dist/sitemap.xml à partir de la source unique src/routes/routeConfig.js.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGS, listIndexableRoutes } from '../src/routes/routeConfig.js';
import { buildHead, hasSeoEntry } from '../src/routes/seo.js';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(rootDir, 'dist');

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function replaceMetaContent(html, attr, key, content) {
  const escaped = escapeHtmlAttr(content);
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*("\\s*\\/?>)`, 'i');
  if (!re.test(html)) {
    throw new Error(`Balise <meta ${attr}="${key}"> introuvable dans le template HTML.`);
  }
  return html.replace(re, `$1${escaped}$2`);
}

function replaceLinkHref(html, relAttr, href) {
  const escaped = escapeHtmlAttr(href);
  const re = new RegExp(`(<link\\s+${relAttr}\\s+href=")[^"]*("\\s*\\/?>)`, 'i');
  if (!re.test(html)) {
    throw new Error(`Balise <link ${relAttr}> introuvable dans le template HTML.`);
  }
  return html.replace(re, `$1${escaped}$2`);
}

function injectHeadIntoHtml(template, head) {
  let html = template;

  html = html.replace(/<html\s+lang="[^"]*"/i, `<html lang="${escapeHtmlAttr(head.lang)}"`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(head.title)}</title>`);

  html = replaceMetaContent(html, 'name', 'description', head.description);
  html = replaceMetaContent(html, 'name', 'robots', head.robots);
  html = replaceMetaContent(html, 'property', 'og:locale', head.ogLocale);
  html = replaceMetaContent(html, 'property', 'og:title', head.title);
  html = replaceMetaContent(html, 'property', 'og:description', head.description);
  html = replaceMetaContent(html, 'property', 'og:url', head.ogUrl);
  html = replaceMetaContent(html, 'name', 'twitter:title', head.title);
  html = replaceMetaContent(html, 'name', 'twitter:description', head.description);

  html = replaceLinkHref(html, 'rel="canonical"', head.canonical);
  html = replaceLinkHref(html, 'rel="alternate"\\s+hreflang="fr"', head.alternates.fr);
  html = replaceLinkHref(html, 'rel="alternate"\\s+hreflang="en"', head.alternates.en);
  html = replaceLinkHref(html, 'rel="alternate"\\s+hreflang="x-default"', head.alternates['x-default']);

  return html;
}

function outputFilePath(routePath, lang) {
  const prefix = lang === 'en' ? join(distDir, 'en') : distDir;
  if (routePath === '/') {
    return join(prefix, 'index.html');
  }
  const cleanRel = routePath.replace(/^\/+/, '');
  return `${join(prefix, cleanRel)}.html`;
}

function buildSitemapXml(routes) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
  ];

  for (const route of routes) {
    for (const lang of LANGS) {
      const head = buildHead({ key: route.seoKey, lang, path: route.path });
      lines.push('  <url>');
      lines.push(`    <loc>${escapeHtmlText(head.canonical)}</loc>`);
      lines.push(`    <xhtml:link rel="alternate" hreflang="fr" href="${escapeHtmlAttr(head.alternates.fr)}" />`);
      lines.push(`    <xhtml:link rel="alternate" hreflang="en" href="${escapeHtmlAttr(head.alternates.en)}" />`);
      lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtmlAttr(head.alternates['x-default'])}" />`);
      lines.push('  </url>');
    }
  }

  lines.push('</urlset>', '');
  return lines.join('\n');
}

async function main() {
  const routes = listIndexableRoutes();

  for (const route of routes) {
    for (const lang of LANGS) {
      if (!hasSeoEntry(route.seoKey, lang)) {
        throw new Error(`Clé SEO manquante : "${route.seoKey}" (${lang})`);
      }
    }
  }

  const templates = {
    fr: await readFile(join(distDir, 'index.html'), 'utf8'),
    en: await readFile(join(distDir, 'en', 'index.html'), 'utf8')
  };

  let htmlCount = 0;
  for (const lang of LANGS) {
    for (const route of routes) {
      const head = buildHead({ key: route.seoKey, lang, path: route.path });
      const html = injectHeadIntoHtml(templates[lang], head);
      const target = outputFilePath(route.path, lang);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, html, 'utf8');
      htmlCount += 1;
    }
  }

  const sitemapXml = buildSitemapXml(routes);
  await writeFile(join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');

  console.log(
    `[prerender-meta] ${htmlCount} fichiers HTML (${routes.length} routes × ${LANGS.length} langues) et dist/sitemap.xml générés.`
  );
}

main().catch(err => {
  console.error('[prerender-meta] Erreur :', err);
  process.exit(1);
});

