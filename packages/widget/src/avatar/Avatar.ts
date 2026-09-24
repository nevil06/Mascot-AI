/**
 * Avatar – abstract interface for the mascot character.
 *
 * Phase 1: PlaceholderAvatar (SVG/CSS cat)
 * Phase 2: RiveAvatar (real .riv file)
 *
 * Both expose the same state-machine inputs so the rest of the widget
 * never needs to know which renderer is active.
 */

import type { Gesture } from '@pitchcat/shared';

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'talking';

export interface Avatar {
  /** Mount the avatar into the given container element. */
  mount(container: HTMLElement): void;

  /** Clean up resources. */
  destroy(): void;

  /** Switch the high-level animation state. */
  setState(state: AvatarState): void;

  /** Set mouth openness (0 = closed, 1 = fully open). */
  setMouth(value: number): void;

  /** Fire a one-shot gesture. */
  triggerGesture(gesture: Gesture): void;

  /** Enable/disable reduced motion mode. */
  setReducedMotion(enabled: boolean): void;

  /** Update cursor position for eye-follow (normalized 0-1). */
  setCursorPosition(x: number, y: number): void;
}
