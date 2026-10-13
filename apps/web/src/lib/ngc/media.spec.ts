import { describe, expect, it } from 'vitest';

import {
  attachCloudinary,
  cloudinaryDeliveryUrl,
  cloudinaryPublicId,
  cloudinaryVideoPoster,
  displayMediaUrl,
  galleryPoster,
  withAutoTransform,
  withStudioPad,
} from './media.js';
import type { NgcMediaItem, NgcProduct } from './types.js';

describe('Cloudinary delivery', () => {
  it('stores public_id under maihan/products/<id>/<file> and renders f_auto,q_auto', () => {
    expect(cloudinaryPublicId('K11733', 'stone.jpg')).toBe('maihan/products/K11733/stone.jpg');
    expect(
      cloudinaryPublicId(
        'JS1231Y18-K2653',
        '01_image_view-01.jpg',
        'media/JS1231Y18-K2653/setting_JS1231/01_image_view-01.jpg',
      ),
    ).toBe('maihan/products/JS1231Y18-K2653/setting_JS1231/01_image_view-01.jpg');
    expect(
      cloudinaryPublicId('JS1231Y18-K2653', 'spin360.mp4', 'media/JS1231Y18-K2653/stone_K2653/spin360'),
    ).toBe('maihan/products/JS1231Y18-K2653/stone_K2653/spin360.mp4');
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

  it('keeps setting/stone subfolders and maps spin360 dirs to spin360.mp4', () => {
    const spin: NgcMediaItem = {
      kind: 'spin360',
      order: 5,
      localPath: 'media/JS1231Y18-K2653/setting_JS1231/spin360',
      fileName: 'spin360.mp4',
    };
    const attached = attachCloudinary('JS1231Y18-K2653', spin);
    expect(attached.cloudinaryPublicId).toBe('maihan/products/JS1231Y18-K2653/setting_JS1231/spin360.mp4');
    expect(attached.secureUrl).toContain('/video/upload/f_auto,q_auto/maihan/products/JS1231Y18-K2653/setting_JS1231/spin360.mp4');
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

describe('gallery posters and studio pad', () => {
  const product = {
    id: 'K11733',
    media: [
      {
        kind: 'video',
        order: 7,
        title: 'Close up',
        fileName: '07_video_k11733-652ba46e-cf30-4cf7-b4e0-5663840e6156-full.mp4',
      },
      {
        kind: 'video_thumbnail',
        order: 8,
        title: 'Close up',
        fileName: '08_video_thumbnail_k11733-652ba46e-cf30-4cf7-b4e0-5663840e6156_thumb.0000000.jpg',
      },
      {
        kind: 'spin360',
        order: 15,
        fileName: 'spin360.mp4',
      },
    ],
  } as Pick<NgcProduct, 'id' | 'media'> as NgcProduct;

  it('pads catalogue stills onto the Design.md canvas', () => {
    const url = 'https://res.cloudinary.com/o1zwhvbi/image/upload/f_auto,q_auto/maihan/products/K10010/stone.jpg';
    expect(withStudioPad(url, 'image')).toContain('c_pad,b_rgb:F7F7F5,w_900,h_900');
  });

  it('builds a so_0 JPEG poster for Cloudinary videos', () => {
    const url = 'https://res.cloudinary.com/o1zwhvbi/video/upload/f_auto,q_auto/maihan/products/K11733/clip.mp4';
    expect(cloudinaryVideoPoster(url)).toBe(
      'https://res.cloudinary.com/o1zwhvbi/video/upload/so_0,f_jpg,q_auto/maihan/products/K11733/clip.mp4',
    );
  });

  it('prefers the uploaded video_thumbnail that shares the clip UUID', () => {
    const poster = galleryPoster(product, product.media[0]!);
    expect(poster).toContain('08_video_thumbnail_k11733-652ba46e-cf30-4cf7-b4e0-5663840e6156_thumb.0000000.jpg');
    expect(poster).toContain('c_pad,b_rgb:F7F7F5');
    expect(poster).not.toContain('.mp4');
  });

  it('uses the spin360 first frame as its own thumbnail', () => {
    const poster = galleryPoster(product, product.media[2]!);
    expect(poster).toContain('/video/upload/so_0,f_jpg,q_auto');
    expect(poster).toContain('spin360.mp4');
  });
});

