import { html, nothing, type TemplateResult } from 'lit';
import type { ResolvedMediaSession } from '../session/types';
import type { MediaIntent } from '../actions/types';

const command = (
  command: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SELECT' | 'BACK' | 'HOME' | 'MENU',
): MediaIntent => ({ kind: 'remote', command });

export function renderRemoteControls(
  session: ResolvedMediaSession,
  action: (intent: MediaIntent) => void,
): TemplateResult | typeof nothing {
  if (!session.capabilities.remoteNavigation) return nothing;

  return html`<section class="remote-panel">
    <div class="quick-row">
      <button @click=${() => action(command('BACK'))}>Back</button>
      <button @click=${() => action(command('HOME'))}>Home</button>
      <button @click=${() => action(command('MENU'))}>Menu</button>
    </div>
    <div class="dpad">
      <span></span><button @click=${() => action(command('UP'))}>▲</button><span></span>
      <button @click=${() => action(command('LEFT'))}>◀</button>
      <button class="select" @click=${() => action(command('SELECT'))}>OK</button>
      <button @click=${() => action(command('RIGHT'))}>▶</button>
      <span></span><button @click=${() => action(command('DOWN'))}>▼</button><span></span>
    </div>
    ${session.capabilities.textEntry
      ? html`<div class="text-entry">
          <input
            aria-label="Send text to Android TV"
            placeholder="Type and press Enter"
            @keydown=${(event: KeyboardEvent) => {
              if (event.key !== 'Enter') return;
              const input = event.target as HTMLInputElement;
              const text = input.value.trim();
              if (!text) return;
              action({ kind: 'text', text });
              input.value = '';
            }}
          />
        </div>`
      : nothing}
  </section>`;
}
