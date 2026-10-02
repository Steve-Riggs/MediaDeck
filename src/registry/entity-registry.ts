import type { HassEntity, HomeAssistant } from '../types/home-assistant';

export interface EntityRegistryMetadata {
  entity_id: string;
  platform?: string;
  device_id?: string;
  area_id?: string;
  name?: string;
}

export type EntityRegistryMap = Record<string, EntityRegistryMetadata>;

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function normalizeEntry(value: unknown): EntityRegistryMetadata | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const entry = value as Record<string, unknown>;
  const entityId = stringValue(entry.ei) ?? stringValue(entry.entity_id);
  if (!entityId) return undefined;
  return {
    entity_id: entityId,
    platform: stringValue(entry.pl) ?? stringValue(entry.platform),
    device_id: stringValue(entry.di) ?? stringValue(entry.device_id),
    area_id: stringValue(entry.ai) ?? stringValue(entry.area_id),
    name: stringValue(entry.en) ?? stringValue(entry.name),
  };
}

export async function loadEntityRegistry(hass: HomeAssistant): Promise<EntityRegistryMap> {
  if (!hass.callWS) return {};
  try {
    const response = await hass.callWS<unknown>({
      type: 'config/entity_registry/list_for_display',
    });
    const values: unknown[] = Array.isArray(response)
      ? response
      : response && typeof response === 'object' && Array.isArray((response as any).entities)
        ? (response as any).entities
        : [];
    return Object.fromEntries(
      values
        .map(normalizeEntry)
        .filter((entry): entry is EntityRegistryMetadata => Boolean(entry))
        .map((entry) => [entry.entity_id, entry]),
    );
  } catch {
    return {};
  }
}

export function entityPlatform(
  entity: HassEntity | undefined,
  registry: EntityRegistryMap = {},
): string | undefined {
  if (!entity) return undefined;
  return (
    registry[entity.entity_id]?.platform ??
    stringValue(entity.attributes.integration) ??
    stringValue(entity.attributes.platform)
  );
}

export function entityOptionLabel(
  hass: HomeAssistant,
  entity: HassEntity,
  registry: EntityRegistryMap = {},
): string {
  const friendly =
    hass.formatEntityName?.(entity) ??
    stringValue(entity.attributes.friendly_name) ??
    registry[entity.entity_id]?.name ??
    entity.entity_id;
  const platform = entityPlatform(entity, registry);
  return `${friendly} — ${entity.entity_id}${platform ? ` — ${platform}` : ''}`;
}

export function uniqueEntities(entities: HassEntity[]): HassEntity[] {
  return [...new Map(entities.map((entity) => [entity.entity_id, entity])).values()].sort((a, b) =>
    a.entity_id.localeCompare(b.entity_id),
  );
}
