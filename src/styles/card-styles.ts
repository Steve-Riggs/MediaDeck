import { css } from 'lit';

export const cardStyles = css`
  :host {
    display: block;
    container-type: inline-size;
  }

  .card {
    box-sizing: border-box;
    min-height: var(--mediadeck-min-height, 320px);
    padding: 18px;
    border-radius: var(--mediadeck-radius, 20px);
    background: var(
      --mediadeck-background,
      var(--ha-card-background, var(--card-background-color, #fff))
    );
    color: var(--mediadeck-text, var(--primary-text-color, #111));
    box-shadow: var(--ha-card-box-shadow, 0 2px 12px rgb(0 0 0 / 0.08));
    overflow: hidden;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--mediadeck-gap, 14px);
    margin-bottom: var(--mediadeck-gap, 14px);
  }

  .header h1 {
    font-size: 1rem;
    margin: 0;
  }

  .status {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .now-playing {
    display: grid;
    grid-template-columns: minmax(120px, var(--mediadeck-artwork, 180px)) 1fr;
    gap: var(--mediadeck-gap, 14px);
    align-items: center;
  }

  .artwork {
    aspect-ratio: 1;
    border-radius: calc(var(--mediadeck-radius, 20px) * 0.75);
    overflow: hidden;
    background: var(--secondary-background-color, #eee);
    display: grid;
    place-items: center;
  }

  .artwork img {
    width: 100%;
    height: 100%;
    object-fit: var(--mediadeck-art-fit, cover);
  }

  .media-copy h2 {
    margin: 0.2rem 0;
    font-size: calc(1.45rem * var(--mediadeck-font-scale, 1));
    line-height: 1.1;
  }

  .media-copy p {
    margin: 0.25rem 0 0.7rem;
    opacity: 0.7;
  }

  .eyebrow,
  .state-line {
    font-size: 0.74rem;
    opacity: 0.72;
  }

  .state-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--mediadeck-accent, var(--primary-color, #03a9f4));
    margin-right: 7px;
  }

  .progress {
    height: 4px;
    border-radius: 99px;
    background: rgb(127 127 127 / 0.2);
    margin-top: 10px;
    overflow: hidden;
  }

  .progress span {
    display: block;
    height: 100%;
    background: var(--mediadeck-accent, var(--primary-color, #03a9f4));
  }

  button,
  select,
  input {
    font: inherit;
  }

  button {
    border: 0;
    border-radius: 13px;
    min-height: 42px;
    padding: 0 14px;
    color: inherit;
    background: var(--mediadeck-button, var(--secondary-background-color, #eee));
    opacity: var(--mediadeck-button-opacity, 0.92);
    cursor: pointer;
  }

  button.primary {
    background: var(--mediadeck-accent, var(--primary-color, #03a9f4));
    color: #fff;
    min-width: 58px;
  }

  .transport button,
  .dpad button {
    font-size: var(--mediadeck-icon-size, 24px);
  }

  .control-row,
  .chip-row,
  .quick-row,
  .audio-row {
    display: flex;
    align-items: center;
    gap: var(--mediadeck-gap, 14px);
    flex-wrap: wrap;
  }

  .transport {
    justify-content: center;
    margin: var(--mediadeck-gap, 14px) 0 4px;
  }

  .remote-panel,
  .source-panel,
  .audio-panel,
  .watch-actions,
  .inspector {
    margin-top: var(--mediadeck-gap, 14px);
  }

  .quick-row {
    justify-content: center;
    margin-bottom: var(--mediadeck-gap, 14px);
  }

  .dpad {
    width: min(240px, 100%);
    margin: auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: calc(var(--mediadeck-gap, 14px) * 0.6);
  }

  .dpad button {
    aspect-ratio: 1.45;
  }

  .dpad .select {
    border-radius: 50%;
    aspect-ratio: 1;
  }

  .text-entry {
    margin-top: var(--mediadeck-gap, 14px);
  }

  .text-entry input {
    box-sizing: border-box;
    width: 100%;
    min-height: 42px;
    border-radius: 12px;
    border: 1px solid var(--divider-color, #ddd);
    background: var(--secondary-background-color, #f6f6f6);
    color: inherit;
    padding: 0 12px;
  }

  .source-panel label {
    display: grid;
    gap: 6px;
    font-size: 0.78rem;
  }

  .source-panel select {
    width: 100%;
    min-height: 42px;
    border-radius: 12px;
    border: 1px solid var(--divider-color, #ddd);
    background: var(--secondary-background-color, #f6f6f6);
    color: inherit;
  }

  .audio-row input {
    flex: 1 1 140px;
  }

  .section-title {
    font-size: 0.78rem;
    font-weight: 650;
    margin-bottom: 7px;
  }

  .inspector {
    font-size: 0.78rem;
    padding: 10px 12px;
    border: 1px solid var(--divider-color, #ddd);
    border-radius: 12px;
  }

  .inspector dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 10px;
  }

  .inspector dd {
    margin: 0;
  }

  .notice {
    padding: 18px;
    text-align: center;
  }

  .error {
    margin-top: 10px;
    padding: 9px 11px;
    background: rgb(219 68 55 / 0.12);
    border-radius: 10px;
    font-size: 0.78rem;
  }

  @container (max-width: 520px) {
    .now-playing {
      grid-template-columns: 90px 1fr;
    }

    .card {
      padding: 14px;
    }
  }

  @container (min-width: 760px) {
    .card-body {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
      gap: calc(var(--mediadeck-gap, 14px) * 1.5);
    }
  }
`;
