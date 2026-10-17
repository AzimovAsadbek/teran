import type { MediaItemDto } from '@teran/contracts';
import type { MediaLabels } from './media-gallery';

/**
 * A tile's visible title, with what the tile does around it for screen readers ("Watch the video:
 * …", "… — enlarge"). Tiles are named by their own text, so the name contains what they show.
 */
export function TileTitle({
  item,
  labels,
  className,
}: {
  item: MediaItemDto;
  labels: Pick<MediaLabels, 'open' | 'play'>;
  className?: string;
}) {
  const [before = '', after = ''] = (item.video ? labels.play : labels.open).split('{title}');
  return (
    <span className={className}>
      {before ? <span className="sr-only">{before}</span> : null}
      {item.title}
      {after ? <span className="sr-only">{after}</span> : null}
    </span>
  );
}
