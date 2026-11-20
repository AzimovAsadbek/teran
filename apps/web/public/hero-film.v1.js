// Start the first screen independently of React hydration. Subsequent mounts use this same definition.
if (!customElements.get('teran-hero-film')) {
  customElements.define(
    'teran-hero-film',
    class extends HTMLElement {
      connectedCallback() {
        const video = this.querySelector('video');
        if (!video) {
          const observer = new MutationObserver(() => {
            if (this.querySelector('video')) {
              observer.disconnect();
              this.connectedCallback();
            }
          });
          observer.observe(this, { childList: true });
          this.cleanup = () => observer.disconnect();
          return;
        }
        const assets = JSON.parse(this.dataset.clips);
        const phone = matchMedia('(max-width: 899px)');
        const motion = matchMedia('(prefers-reduced-motion: reduce)');
        const connection = navigator.connection;
        const events = new AbortController();
        const options = { signal: events.signal };
        let visible = false;
        let choice;
        let source;
        let failed;
        let blocked = false;
        let stalledWidth = 0;
        let bufferTimer;
        const poster = this.closest('[data-hero-media]')?.querySelector('[data-film-poster]');
        let posterMode;
        let stillTimer;
        const sharpenPoster = (mode) => {
          if (!poster || posterMode === mode) return;
          posterMode = mode;
          for (const image of poster.querySelectorAll('source, img')) {
            if (image.dataset[mode]) image.srcset = image.dataset[mode];
          }
        };
        let loading;
        let objectUrl;
        const release = () => {
          loading?.abort();
          loading = undefined;
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = undefined;
        };
        const readChoice = () => {
          try {
            choice = localStorage.getItem('teran.motion');
          } catch {}
        };
        readChoice();
        const motionEnabled = () =>
          !document.hidden && choice !== 'paused' && (!motion.matches || choice === 'playing');
        const allowed = () => visible && motionEnabled();
        const start = () => {
          if (!allowed()) return;
          video.muted = true;
          void video.play().catch((error) => {
            blocked = error.name === 'NotAllowedError';
          });
        };
        // Chrome queues ordinary video behind hydration scripts on congested HTTP connections.
        // Give only a known, tiny first-screen copy high priority. Larger films always stream.
        const loadSmall = async (url, maxBytes, abort) => {
          try {
            const response = await fetch(url, {
              priority: 'high',
              signal: abort.signal,
              headers: { Range: 'bytes=0-' + (maxBytes - 1) },
            });
            const size = Number(response.headers.get('content-length'));
            const whole =
              response.status === 200 ||
              response.headers.get('content-range') === 'bytes 0-' + (size - 1) + '/' + size;
            if (!response.ok || !whole || !size || size > maxBytes) {
              await response.body?.cancel();
              throw new Error('Use native video streaming');
            }
            const blob = await response.blob();
            if (abort.signal.aborted) return;
            objectUrl = URL.createObjectURL(blob);
            video.src = objectUrl;
          } catch {
            if (abort.signal.aborted) return;
            video.src = url;
          } finally {
            if (loading === abort) loading = undefined;
          }
          start();
        };
        const sync = (firstView = false) => {
          const slow =
            connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType);
          const reported = slow ? 320 : connection?.effectiveType === '3g' ? 640 : 0;
          const budget = stalledWidth ? Math.min(reported || stalledWidth, stalledWidth) : reported;
          if (!budget) sharpenPoster('full');
          if (!allowed()) {
            if (visible && budget) sharpenPoster('small');
            video.pause();
            // Layout waits for CSS. The first visible hero can prepare its tiny copy while CSS
            // arrives. Deep links, restored scroll positions and motion preferences still win.
            const prepareFirstView =
              firstView === true && slow && !window.scrollY && !location.hash && motionEnabled();
            if (!prepareFirstView) return;
          }
          if (visible && budget && !stillTimer) {
            stillTimer = setTimeout(() => {
              if (!video.currentTime) sharpenPoster('small');
            }, 6000);
          }
          const clip = (phone.matches && assets.mobile) || assets.wide;
          const needed = Math.max(
            this.clientWidth,
            this.clientHeight * (clip.width && clip.height ? clip.width / clip.height : 16 / 9),
          );
          const high = clip.sources.filter((copy) => copy.width > 640 || copy.src === clip.src);
          const copy = budget
            ? clip.sources.filter((item) => item.width <= budget).at(-1) || clip.sources[0]
            : high.find((item) => item.width >= needed * 0.9) || high.at(-1);
          const preferred = copy?.src || clip.src;
          const next = failed === preferred ? clip.src : preferred;
          if (next !== source) {
            clearTimeout(bufferTimer);
            bufferTimer = undefined;
            release();
            source = next;
            video.dataset.networkSrc = new URL(next, document.baseURI).href;
            blocked = false;
            video.style.opacity = '0';
            video.style.objectPosition = clip.focusX + '% ' + clip.focusY + '%';
            video.style.maskImage = clip.mask ? 'url(' + JSON.stringify(clip.mask) + ')' : '';
            video.style.maskPosition = video.style.objectPosition;
            if (
              budget === 320 &&
              copy &&
              copy.width <= budget &&
              next === preferred &&
              typeof fetch === 'function'
            ) {
              loading = new AbortController();
              void loadSmall(next, 96 * 1024, loading);
            } else video.src = next;
          }
          if (!loading) start();
        };
        const show = () => {
          clearTimeout(bufferTimer);
          bufferTimer = undefined;
          blocked = false;
          video.style.opacity = '1';
        };
        // Safari may have no connection estimate. A visible film with no playback progress
        // can still switch to its smallest rendition when the initial stream is too slow.
        const watchBuffer = () => {
          if (bufferTimer || !allowed() || !source) return;
          const clip = (phone.matches && assets.mobile) || assets.wide;
          const smallest = clip.sources[0];
          if (!smallest || smallest.src === source || stalledWidth) return;
          const previous = video.currentTime;
          bufferTimer = setTimeout(
            () => {
              bufferTimer = undefined;
              if (!allowed() || blocked || video.readyState >= 3 || video.currentTime > previous)
                return;
              stalledWidth = smallest.width;
              sync();
            },
            connection?.effectiveType ? 12000 : 5000,
          );
        };
        video.addEventListener('playing', show, options);
        for (const event of ['loadstart', 'waiting', 'stalled']) {
          video.addEventListener(event, watchBuffer, options);
        }
        video.addEventListener(
          'error',
          () => {
            video.style.opacity = '0';
            const clip = (phone.matches && assets.mobile) || assets.wide;
            if (source && source !== clip.src) {
              failed = source;
              sync();
            }
          },
          options,
        );
        const gesture = () => {
          if (blocked) start();
        };
        document.addEventListener('pointerup', gesture, options);
        document.addEventListener('keydown', gesture, options);
        document.addEventListener('visibilitychange', sync, options);
        window.addEventListener(
          'storage',
          (event) => {
            if (event.key === 'teran.motion') {
              readChoice();
              sync();
            }
          },
          options,
        );
        window.addEventListener(
          'teran-motion-change',
          (event) => {
            choice = event.detail;
            sync();
          },
          options,
        );
        window.addEventListener(
          'online',
          () => {
            if (video.error && allowed()) {
              video.load();
              start();
            }
          },
          options,
        );
        phone.addEventListener('change', sync, options);
        motion.addEventListener('change', sync, options);
        connection?.addEventListener(
          'change',
          () => {
            stalledWidth = 0;
            sync();
          },
          options,
        );
        const observer = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          sync();
        });
        observer.observe(this);
        sync(true);
        this.cleanup = () => {
          release();
          clearTimeout(bufferTimer);
          clearTimeout(stillTimer);
          events.abort();
          observer.disconnect();
          video.pause();
        };
      }
      disconnectedCallback() {
        this.cleanup?.();
      }
    },
  );
}
