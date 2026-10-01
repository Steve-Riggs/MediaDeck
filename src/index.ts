import { MediaDeckCard } from './mediadeck-card';
import { MediaDeckEditor } from './mediadeck-editor';
if (!customElements.get('mediadeck-card')) customElements.define('mediadeck-card', MediaDeckCard);
if (!customElements.get('mediadeck-editor'))
  customElements.define('mediadeck-editor', MediaDeckEditor);
window.customCards = window.customCards ?? [];
if (!window.customCards.some((c) => c.type === 'mediadeck-card'))
  window.customCards.push({
    type: 'mediadeck-card',
    name: 'MediaDeck',
    description: 'Unified TV, streaming-device, remote and AVR control for Home Assistant.',
    preview: true,
    documentationURL: 'https://github.com/Steve-Riggs/MediaDeck',
  });
console.info(
  '%c MediaDeck %c 0.1.0-alpha.1 ',
  'background:#111;color:#fff;padding:2px 6px',
  'background:#03a9f4;color:#fff;padding:2px 6px',
);
export { MediaDeckCard, MediaDeckEditor };
export * from './config/types';
export * from './session/types';
export * from './actions/types';
