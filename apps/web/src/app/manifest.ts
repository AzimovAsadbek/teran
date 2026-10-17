import type { MetadataRoute } from 'next';

/** Name, colours and icons used when the store is added to a phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'TERAN — premium Chinese tea',
    short_name: 'TERAN',
    description: 'TERAN premium Chinese green tea from Hunan and Yunnan, in 400 g zip pouches.',
    lang: 'uz',
    start_url: '/',
    display: 'browser',
    background_color: '#ffffff',
    theme_color: '#107e84',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
