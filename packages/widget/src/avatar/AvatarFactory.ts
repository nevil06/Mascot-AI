import type { Avatar } from './Avatar';
import { ThreeAvatar } from './ThreeAvatar';
import { PlaceholderAvatar } from './PlaceholderAvatar';
import type { MascotAvatarType } from '@pitchcat/shared';

/**
 * AvatarFactory creates the appropriate avatar renderer based on user configuration:
 * - '3d-cat': High-performance Three.js WebGL 3D character with PBR materials, eye tracking, and jaw lip-sync.
 * - 'placeholder-svg': Ultra-lightweight SVG/CSS character (zero WebGL dependencies).
 */
export class AvatarFactory {
  static create(type: MascotAvatarType = '3d-cat'): Avatar {
    switch (type) {
      case 'placeholder-svg':
        return new PlaceholderAvatar();
      case '3d-cat':
      default:
        return new ThreeAvatar();
    }
  }
}
