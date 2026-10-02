import type { MediaDeckConfig, ValidationResult } from './types';

export function isEditorBootstrapConfig(
  config: MediaDeckConfig,
  validation: ValidationResult,
): boolean {
  return (
    config.entity === '' &&
    validation.errors.length === 1 &&
    validation.errors[0] === 'entity is required.'
  );
}
