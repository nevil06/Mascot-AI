import { type CompanyConfig, CompanyConfigSchema, DEMO_CARBONDOT_CONFIG } from '@pitchcat/shared';
import { PitchCatWidget } from './widget/PitchCatWidget';

export { DEMO_CARBONDOT_CONFIG };

/**
 * Initializes and mounts PitchCat to the DOM.
 */
export function mountPitchCat(config: Partial<CompanyConfig> = DEMO_CARBONDOT_CONFIG): PitchCatWidget {
  // Merge user provided config with sensible defaults
  const merged: CompanyConfig = {
    ...DEMO_CARBONDOT_CONFIG,
    ...config,
    mascot: {
      ...DEMO_CARBONDOT_CONFIG.mascot,
      ...(config.mascot || {}),
    },
    theme: {
      ...DEMO_CARBONDOT_CONFIG.theme,
      ...(config.theme || {}),
    },
    tools: {
      ...DEMO_CARBONDOT_CONFIG.tools,
      ...(config.tools || {}),
    },
    pitches: {
      ...DEMO_CARBONDOT_CONFIG.pitches,
      ...(config.pitches || {}),
    },
  };

  const validated = CompanyConfigSchema.parse(merged);
  let widget = document.querySelector('pitchcat-widget') as PitchCatWidget | null;

  if (!widget) {
    widget = document.createElement('pitchcat-widget') as PitchCatWidget;
    document.body.appendChild(widget);
  }

  widget.init(validated);
  return widget;
}

/**
 * Universal auto-init supporting:
 * 1. Inline JSON config: <script id="mascot-config" type="application/json">{ ... }</script>
 * 2. External JSON file: <script src="..." data-config="/mascot.config.json"></script>
 * 3. Remote API config: <script src="..." data-company="acme" data-api="http://..."></script>
 * 4. Zero-config fallback: <script src="..."></script>
 */
async function autoInit(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const runMount = async () => {
    try {
      // 1. Check for inline JSON config block
      const inlineConfigEl = document.querySelector('#mascot-config, script[data-mascot-config]');
      if (inlineConfigEl && inlineConfigEl.textContent) {
        try {
          const parsed = JSON.parse(inlineConfigEl.textContent);
          mountPitchCat(parsed);
          return;
        } catch (e) {
          console.warn('[PitchCat] Failed to parse inline #mascot-config JSON:', e);
        }
      }

      // Find the invoking script element
      const currentScript =
        document.currentScript ||
        document.querySelector('script[data-config]') ||
        document.querySelector('script[data-company]') ||
        document.querySelector('script[src*="pitchcat"]') ||
        document.querySelector('script[src*="mascot"]');

      const configUrl = currentScript?.getAttribute('data-config');
      const companyId = currentScript?.getAttribute('data-company') || 'carbondot';
      const apiBase = currentScript?.getAttribute('data-api') || '';

      // 2. Load from JSON config file if data-config is specified
      if (configUrl) {
        try {
          const res = await fetch(configUrl);
          if (res.ok) {
            const json = await res.json();
            mountPitchCat(json);
            return;
          }
        } catch (e) {
          console.warn(`[PitchCat] Failed to fetch config from "${configUrl}":`, e);
        }
      }

      // 3. Load from API if data-api is provided and company isn't default
      if (apiBase) {
        try {
          const res = await fetch(`${apiBase.replace(/\/$/, '')}/v1/config/${companyId}`);
          if (res.ok) {
            const json = await res.json();
            mountPitchCat(json);
            return;
          }
        } catch (e) {
          console.warn(`[PitchCat] Failed to fetch config from API "${apiBase}":`, e);
        }
      }

      // 4. Default demo config with provided companyId
      const config = {
        ...DEMO_CARBONDOT_CONFIG,
        id: companyId,
      };

      mountPitchCat(config);
    } catch (err) {
      console.error('[PitchCat] Initialization error:', err);
      // Graceful fallback to guarantee widget always mounts
      mountPitchCat(DEMO_CARBONDOT_CONFIG);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => runMount());
  } else {
    runMount();
  }
}

// Expose programmatic API on window
declare global {
  interface Window {
    PitchCat: {
      mount: typeof mountPitchCat;
      DEMO_CONFIG: typeof DEMO_CARBONDOT_CONFIG;
    };
    MascotAI: {
      mount: typeof mountPitchCat;
      DEMO_CONFIG: typeof DEMO_CARBONDOT_CONFIG;
    };
  }
}

if (typeof window !== 'undefined') {
  window.PitchCat = {
    mount: mountPitchCat,
    DEMO_CONFIG: DEMO_CARBONDOT_CONFIG,
  };
  window.MascotAI = window.PitchCat;
  autoInit();
}

export * from './avatar/Avatar';
export * from './avatar/AvatarFactory';
export * from './avatar/ThreeAvatar';
export * from './avatar/PlaceholderAvatar';
export * from './audio/AudioEngine';
export * from './timeline/TimelinePlayer';
export * from './voice/LiveVoiceEngine';
export * from './widget/PitchCatWidget';
