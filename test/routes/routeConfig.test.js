import { describe, it, expect } from 'vitest';
import {
  SITE_URL,
  LANGS,
  DEFAULT_LANG,
  detectLang,
  basenameFor,
  localizedPath,
  absoluteUrl,
  PUZZLES,
  METHODS,
  findMethod,
  findMethodByKey,
  sectionBySlug,
  sectionById,
  paths,
  listIndexableRoutes,
} from '../../src/routes/routeConfig.js';
