import {
  MEDIADECK_SCHEMA_VERSION,
  type MediaDeckAction,
  type MediaDeckConfig,
  type RegionName,
  type ValidationResult,
} from './types';
import type { PlatformId } from '../platforms/types';

const REGIONS: RegionName[] = [
  'now_playing',
  'transport',
  'remote',
  'sources',
  'audio',
  'watch_actions',
  'inspector',
];
const PLATFORMS: PlatformId[] = ['generic', 'android-tv', 'apple-tv', 'samsung-tv', 'lg-webos'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isEntityId(value: unknown): value is string {
  return typeof value === 'string' && value.includes('.');
}

function isPlatform(value: unknown): value is PlatformId {
  return typeof value === 'string' && PLATFORMS.includes(value as PlatformId);
}

function isAction(value: unknown): value is MediaDeckAction {
  if (!isRecord(value)) return false;
  return (
    value.action === 'call-service' &&
    typeof value.service === 'string' &&
    /^[a-z0-9_]+\.[a-z0-9_]+$/.test(value.service) &&
    (value.target === undefined || isRecord(value.target)) &&
    (value.data === undefined || isRecord(value.data)) &&
    (value.confirmation === undefined || typeof value.confirmation === 'string')
  );
}

export function validateConfig(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) return { valid: false, errors: ['Config must be an object.'] };
  const c = input as Partial<MediaDeckConfig> & Record<string, unknown>;
  if (c.type !== 'custom:mediadeck-card') errors.push('type must be custom:mediadeck-card.');
  if (!isEntityId(c.entity)) errors.push('entity is required.');
  if (c.platform !== undefined && !isPlatform(c.platform)) errors.push('platform is invalid.');

  if (c.entities !== undefined) {
    if (!isRecord(c.entities)) errors.push('entities must be an object.');
    else {
      for (const role of ['metadata', 'transport', 'remote', 'audio'] as const) {
        const value = c.entities[role];
        if (value !== undefined && !isEntityId(value)) errors.push(`entities.${role} is invalid.`);
      }
      const related = c.entities.related;
      if (related !== undefined && (!Array.isArray(related) || !related.every(isEntityId)))
        errors.push('entities.related must be an array of entity IDs.');
    }
  }

  if (c.source_mappings !== undefined) {
    if (!isRecord(c.source_mappings)) errors.push('source_mappings must be an object.');
    else {
      for (const [source, value] of Object.entries(c.source_mappings)) {
        if (!isRecord(value) || !isEntityId(value.entity)) {
          errors.push(`source_mappings.${source} is invalid.`);
          continue;
        }
        for (const key of ['remote', 'audio_entity'] as const) {
          if (value[key] !== undefined && !isEntityId(value[key]))
            errors.push(`source_mappings.${source}.${key} is invalid.`);
        }
        for (const key of ['label', 'icon'] as const) {
          if (value[key] !== undefined && typeof value[key] !== 'string')
            errors.push(`source_mappings.${source}.${key} is invalid.`);
        }
        if (value.platform !== undefined && !isPlatform(value.platform))
          errors.push(`source_mappings.${source}.platform is invalid.`);
      }
    }
  }

  if (c.custom_actions !== undefined) {
    if (!isRecord(c.custom_actions)) errors.push('custom_actions must be an object.');
    else
      for (const [name, action] of Object.entries(c.custom_actions))
        if (!isAction(action)) errors.push(`custom_actions.${name} is invalid.`);
  }

  if (c.watch_actions !== undefined) {
    if (!Array.isArray(c.watch_actions)) errors.push('watch_actions must be an array.');
    else
      c.watch_actions.forEach((watch, index) => {
        if (!isRecord(watch) || typeof watch.name !== 'string' || !isAction(watch.action))
          errors.push(`watch_actions.${index} is invalid.`);
      });
  }

  if (c.regions !== undefined) {
    if (!isRecord(c.regions)) errors.push('regions must be an object.');
    else
      for (const [region, visible] of Object.entries(c.regions))
        if (!REGIONS.includes(region as RegionName) || typeof visible !== 'boolean')
          errors.push(`regions.${region} is invalid.`);
  }

  if (c.section_order !== undefined) {
    if (
      !Array.isArray(c.section_order) ||
      !c.section_order.every(
        (region) => typeof region === 'string' && REGIONS.includes(region as RegionName),
      )
    )
      errors.push('section_order must contain valid region names.');
  }

  if (c.appearance !== undefined) {
    if (!isRecord(c.appearance)) errors.push('appearance must be an object.');
    else {
      const numeric = [
        'min_height',
        'artwork_size',
        'border_radius',
        'opacity',
        'button_opacity',
        'icon_size',
        'font_scale',
        'gap',
      ];
      for (const key of numeric) {
        const value = c.appearance[key];
        if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value)))
          errors.push(`appearance.${key} must be a number.`);
      }
      if (
        c.appearance.density !== undefined &&
        !['compact', 'standard', 'expanded'].includes(String(c.appearance.density))
      )
        errors.push('appearance.density is invalid.');
      if (
        c.appearance.artwork_fit !== undefined &&
        !['cover', 'contain'].includes(String(c.appearance.artwork_fit))
      )
        errors.push('appearance.artwork_fit is invalid.');
      for (const key of ['background', 'text_color', 'accent_color', 'button_background']) {
        const value = c.appearance[key];
        if (value !== undefined && typeof value !== 'string')
          errors.push(`appearance.${key} must be a string.`);
      }
    }
  }

  if (c.discovery !== undefined) {
    if (!isRecord(c.discovery)) errors.push('discovery must be an object.');
    else {
      if (c.discovery.enabled !== undefined && typeof c.discovery.enabled !== 'boolean')
        errors.push('discovery.enabled must be a boolean.');
      if (
        c.discovery.minimum_confidence !== undefined &&
        (typeof c.discovery.minimum_confidence !== 'number' ||
          c.discovery.minimum_confidence < 0 ||
          c.discovery.minimum_confidence > 1)
      )
        errors.push('discovery.minimum_confidence must be between 0 and 1.');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function migrateConfig(input: unknown): MediaDeckConfig {
  if (!isRecord(input)) throw new Error('MediaDeck config must be an object.');
  const c = { ...input } as unknown as MediaDeckConfig;
  return { ...c, type: 'custom:mediadeck-card', schema_version: MEDIADECK_SCHEMA_VERSION };
}
