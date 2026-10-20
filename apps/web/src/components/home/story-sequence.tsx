import type { ImageDto, Locale } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { brandCopy, COLLECTION_CODES, PREMIUM_COLLECTION_SLUG, teaCodeOf } from '@/content/brand';
import { getProductList } from '@/lib/data/catalog';
import { getPublicSettings } from '@/lib/data/content';
import { visualFor } from '@/lib/visuals';
import { StorySequenceView, type StoryStep } from './story-sequence-view';

/**
 * The story of the name, told from the garden to the cup (the home page's editorial moment): the
 * official heading and its first sentence, then four steps — the mountain gardens, the five teas'
 * own leaves (the owner's photographs), the brewing printed on the packs, and the guest it is
 * poured for (the story's own second sentence). Each step brings its picture or film from
 * Admin → Settings — Chinese tea terraces (`home.values`), the gongfu tray (`home.feature`) and
 * the celadon pour (`home.banner.3`); a step without one keeps its words only.
 */
export async function StorySequence() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [t, tn, list, settings] = await Promise.all([
    getTranslations('Home'),
    getTranslations('Nav'),
    getProductList(locale, `collection=${PREMIUM_COLLECTION_SLUG}&pageSize=8&sort=featured`).catch(
      () => null,
    ),
    getPublicSettings(locale).catch(() => null),
  ]);
  const garden = visualFor(settings, 'home.values');
  const brew = visualFor(settings, 'home.feature');
  const guest = visualFor(settings, 'home.banner.3');
  const copy = brandCopy[locale];
  const leaves: { code: string; image: ImageDto }[] = (list?.items ?? [])
    .flatMap((product) => {
      const code = teaCodeOf(product.slug);
      return code && product.hoverImage ? [{ code, image: product.hoverImage }] : [];
    })
    .sort(
      (a, b) =>
        COLLECTION_CODES.indexOf(a.code as never) - COLLECTION_CODES.indexOf(b.code as never),
    );

  const steps: StoryStep[] = [
    {
      key: 'garden',
      title: t('storySteps.garden.title'),
      text: t('storySteps.garden.text'),
      media: garden ? { kind: 'visual', visual: garden } : null,
    },
    {
      key: 'leaf',
      title: t('storySteps.leaf.title'),
      text: t('storySteps.leaf.text'),
      media: leaves.length >= 3 ? { kind: 'leaves', leaves } : null,
    },
    {
      key: 'brew',
      title: t('storySteps.brew.title'),
      text: t('storySteps.brew.text'),
      media: brew ? { kind: 'visual', visual: brew } : null,
    },
    {
      key: 'guest',
      title: t('storySteps.guest.title'),
      // The story's second sentence (the first opens the section; the tagline is the first view's).
      text: copy.story.paragraphs[1] ?? copy.description,
      media: guest ? { kind: 'visual', visual: guest } : null,
    },
  ];

  return (
    <StorySequenceView
      heading={copy.story.heading}
      intro={copy.story.paragraphs[0] ?? ''}
      steps={steps}
      more={{ href: '/about', label: t('storyCta') }}
      learn={{ href: '/tea-101', label: tn('tea101') }}
    />
  );
}
