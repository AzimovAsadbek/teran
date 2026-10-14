import type { MetadataRoute } from 'next';

/** Name, colours and icons used when the store is added to a phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TERAN',
    short_name: 'TERAN',
    start_url: '/',
    display: 'browser',
    background_color: '#fcfaf4',
    theme_color: '#0e3d12',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
