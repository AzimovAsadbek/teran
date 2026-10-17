import type { SocialNetwork } from '@/lib/contact';
import { cn } from '@/lib/cn';

/** Network names as the networks write them (the same in every language). */
export const NETWORK_NAMES: Record<SocialNetwork, string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

/**
 * A network's mark: its own colour in a disc, with a simple white sign (a paper plane, a speech
 * bubble with a handset, a camera, a play button), so a visitor finds the network at a glance.
 * Drawn here rather than copied from the networks' logo files; decorative (the link names it).
 */
export function SocialIcon({
  network,
  className,
  mono = false,
}: {
  network: SocialNetwork;
  className?: string;
  /** The sign alone in the current colour, as the reference's footer marks (no coloured disc). */
  mono?: boolean;
}) {
  if (mono) return <MonoSign network={network} className={className} />;
  const disc = {
    telegram: '#229ED9',
    whatsapp: '#25D366',
    instagram: '#E1306C',
    youtube: '#FF0000',
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('shrink-0', className)}>
      <circle cx="12" cy="12" r="12" fill={disc[network]} />
      {network === 'telegram' ? (
        <path
          fill="#fff"
          d="M5.4 11.7 16.5 7.4c.5-.2 1 .1.8.9l-1.9 8.9c-.1.6-.5.8-1 .5l-2.9-2.1-1.4 1.4c-.2.2-.3.3-.6.3l.2-2.9 5.3-4.8c.2-.2 0-.3-.3-.1l-6.6 4.1-2.8-.9c-.6-.2-.6-.6.1-.9Z"
        />
      ) : null}
      {network === 'whatsapp' ? (
        <>
          <path
            fill="none"
            stroke="#fff"
            strokeWidth="1.5"
            d="M12 5.3a6.7 6.7 0 0 0-5.8 10.1l-.9 3.3 3.4-.9A6.7 6.7 0 1 0 12 5.3Z"
          />
          <path
            fill="#fff"
            d="M9.6 9c.2-.4.4-.4.6-.4h.4c.1 0 .3 0 .4.3l.6 1.3c.1.2 0 .3-.1.5l-.3.4c-.1.1-.2.3-.1.4.3.6.8 1.1 1.3 1.5.5.3 1 .6 1.5.8.2.1.3 0 .4-.1l.5-.6c.1-.2.3-.2.4-.1l1.2.6c.2.1.3.1.3.3 0 .2 0 .8-.4 1.2-.3.4-1 .7-1.4.7-.5 0-1-.1-2.2-.6-1.8-.8-3-2.6-3.1-2.8-.1-.1-.7-1-.7-1.9 0-.9.4-1.4.5-1.5Z"
          />
        </>
      ) : null}
      {network === 'instagram' ? (
        <g fill="none" stroke="#fff" strokeWidth="1.5">
          <rect x="6.8" y="6.8" width="10.4" height="10.4" rx="3.2" />
          <circle cx="12" cy="12" r="2.5" />
          <circle cx="15.1" cy="8.9" r=".45" fill="#fff" stroke="none" />
        </g>
      ) : null}
      {network === 'youtube' ? <path fill="#fff" d="M10 8.6v6.8l5.6-3.4Z" /> : null}
    </svg>
  );
}

/** A network's sign drawn with the current colour on its own (the reference's white footer marks). */
function MonoSign({ network, className }: { network: SocialNetwork; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('shrink-0', className)}>
      {network === 'telegram' ? (
        <path
          fill="currentColor"
          d="M2.2 11.3 19.9 4.5c.8-.3 1.6.2 1.3 1.4l-3 14.2c-.2 1-.8 1.2-1.6.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.6 8.5-7.7c.4-.3-.1-.5-.6-.2L6.5 14.2l-4.5-1.4c-1-.3-1-1 .2-1.5Z"
        />
      ) : null}
      {network === 'whatsapp' ? (
        <>
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            d="M12 2.6a9.4 9.4 0 0 0-8.1 14.2l-1.3 4.6 4.8-1.3A9.4 9.4 0 1 0 12 2.6Z"
          />
          <path
            fill="currentColor"
            d="M8.6 7.6c.2-.5.5-.5.8-.5h.6c.2 0 .4 0 .6.4l.8 1.9c.1.2 0 .4-.1.6l-.4.6c-.1.2-.2.3-.1.5.4.8 1.1 1.5 1.8 2.1.7.5 1.4.8 2.1 1.1.3.1.4 0 .6-.2l.7-.8c.2-.2.4-.2.6-.1l1.7.8c.3.1.4.2.4.4 0 .3 0 1.1-.6 1.7-.4.5-1.4 1-2 1-.7 0-1.4-.1-3.1-.8-2.5-1.1-4.2-3.7-4.4-3.9-.1-.2-1-1.4-1-2.7 0-1.3.6-2 .8-2.2Z"
          />
        </>
      ) : null}
      {network === 'instagram' ? (
        <g fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="5.2" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r=".8" fill="currentColor" stroke="none" />
        </g>
      ) : null}
      {network === 'youtube' ? (
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15.1V8.9l5.2 3.1L10 15.1Z"
        />
      ) : null}
    </svg>
  );
}
