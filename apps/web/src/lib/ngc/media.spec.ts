import { describe, expect, it } from 'vitest';

import {
  attachCloudinary,
  cloudinaryDeliveryUrl,
  cloudinaryPublicId,
  displayMediaUrl,
  withAutoTransform,
} from './media.js';
import type { NgcMediaItem } from './types.js';

describe('Cloudinary delivery', () => {
  it('stores public_id under maihan/products/<id>/<file> and renders f_auto,q_auto', () => {
    expect(cloudinaryPublicId('K11733', 'stone.jpg')).toBe('maihan/products/K11733/stone.jpg');
    expect(cloudinaryDeliveryUrl('maihan/products/K11733/stone.jpg', 'image')).toBe(
      'https://res.cloudinary.com/o1zwhvbi/image/upload/f_auto,q_auto/maihan/products/K11733/stone.jpg',
    );
    expect(cloudinaryDeliveryUrl('maihan/products/K11733/clip.mp4', 'video')).toBe(
      'https://res.cloudinary.com/o1zwhvbi/video/upload/f_auto,q_auto/maihan/products/K11733/clip.mp4',
    );
    expect(cloudinaryDeliveryUrl('maihan/products/K11733/scan.srn', 'raw')).toBe(
      'https://res.cloudinary.com/o1zwhvbi/raw/upload/maihan/products/K11733/scan.srn',
    );
  });

  it('injects f_auto,q_auto into a mapping secure_url without duplicating it', () => {
    const raw = 'https://res.cloudinary.com/o1zwhvbi/image/upload/v1791916341/maihan/products/K11733/stone.jpg';
    expect(withAutoTransform(raw, 'image')).toBe(
      'https://res.cloudinary.com/o1zwhvbi/image/upload/f_auto,q_auto/v1791916341/maihan/products/K11733/stone.jpg',
    );
    expect(withAutoTransform(withAutoTransform(raw, 'image'), 'image')).toContain('/upload/f_auto,q_auto/');
  });

  it('prefers Cloudinary over the original NGC URL', () => {
    const item: NgcMediaItem = {
      kind: 'image',
      order: 1,
      url: 'https://images.thenaturalsapphirecompany.com/stone/k11733/image/stone.jpg',
      fileName: '01_image_stone.jpg',
    };
    const attached = attachCloudinary('K11733', item);
    expect(attached.cloudinaryPublicId).toBe('maihan/products/K11733/01_image_stone.jpg');
    expect(displayMediaUrl('K11733', item)).toContain('/image/upload/f_auto,q_auto/maihan/products/K11733/01_image_stone.jpg');
  });
});
