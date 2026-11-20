import { useEffect, type RefObject } from 'react';

/** Stream a visible silent loop. Some browsers require a gesture even for muted inline video. */
export function useAmbientPlayback(
  ref: RefObject<HTMLVideoElement | null>,
  source: string | null,
  playing: boolean,
  preferSmaller?: () => void,
) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!source) {
      if (!video.paused) video.pause();
      return;
    }
    let active = true;
    let blocked = false;
    let timer: number | undefined;
    const clearBufferTimer = () => {
      window.clearTimeout(timer);
      timer = undefined;
    };
    const watchBuffer = () => {
      if (!preferSmaller || timer !== undefined || !playing || document.hidden) return;
      const previous = video.currentTime;
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string } })
        .connection;
      timer = window.setTimeout(
        () => {
          timer = undefined;
          if (!blocked && !document.hidden && video.readyState < 3 && video.currentTime <= previous)
            preferSmaller();
        },
        connection?.effectiveType ? 12_000 : 5_000,
      );
    };
    const stopListening = () => {
      document.removeEventListener('pointerup', start);
      document.removeEventListener('keydown', start);
    };
    function start() {
      if (!active || !video || !playing || document.visibilityState === 'hidden') return;
      video.muted = true;
      void video
        .play()
        .then(() => {
          blocked = false;
          stopListening();
        })
        .catch((error: unknown) => {
          if (!active || !(error instanceof DOMException) || error.name !== 'NotAllowedError')
            return;
          blocked = true;
          document.addEventListener('pointerup', start);
          document.addEventListener('keydown', start);
        });
    }
    const sync = () => {
      if (playing && document.visibilityState !== 'hidden') start();
      else video.pause();
    };
    const reconnect = () => {
      if (playing && video.error) {
        video.load();
        start();
      }
    };
    if (preferSmaller) {
      video.addEventListener('playing', clearBufferTimer);
      video.addEventListener('waiting', watchBuffer);
      video.addEventListener('stalled', watchBuffer);
      video.addEventListener('loadstart', watchBuffer);
    }
    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('online', reconnect);
    return () => {
      active = false;
      clearBufferTimer();
      video.removeEventListener('playing', clearBufferTimer);
      video.removeEventListener('waiting', watchBuffer);
      video.removeEventListener('stalled', watchBuffer);
      video.removeEventListener('loadstart', watchBuffer);
      stopListening();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('online', reconnect);
    };
  }, [ref, source, playing, preferSmaller]);
}
