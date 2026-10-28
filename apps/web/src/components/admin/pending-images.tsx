'use client';

import { ArrowLeft, ArrowRight, Loader2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { buttonClasses, iconButtonClasses } from '@/components/ui/button';
import { prepareImageFile, type ImageProblem } from '@/lib/admin/media-files';
import { IMAGE_PICK } from '@/lib/admin/uploads';
import { cn } from '@/lib/cn';
import { useLocalImageProblem } from './admin-errors';

interface Pending {
  key: string;
  name: string;
  /** The local preview of the file as chosen. */
  url: string;
  /** The picture made ready to send (ADR-061): null while it is being made ready, or refused. */
  file: File | null;
  width: number | null;
  height: number | null;
  problem: ImageProblem | null;
}

/**
 * Pictures chosen for a product that is not created yet (ADR-063): each previewed and made ready in
 * the browser (any size, ADR-061), kept in the order staff set (the first is the main one) and
 * handed over, to be uploaded together with the product when it is created.
 */
export function PendingImages({
  max,
  onChange,
}: {
  max: number;
  /** The pictures ready to send, in order (a stable function, such as a state setter). */
  onChange: (files: File[]) => void;
}) {
  const t = useTranslations('Admin');
  const inputId = useId();
  const localProblem = useLocalImageProblem();
  const [items, setItems] = useState<Pending[]>([]);
  const [overflow, setOverflow] = useState(false);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  useEffect(() => {
    onChange(items.flatMap((item) => (item.file ? [item.file] : [])));
  }, [items, onChange]);

  async function choose(list: FileList | null) {
    if (!list || list.length === 0) return;
    const room = max - items.length;
    setOverflow(list.length > room);
    const files = Array.from(list).slice(0, Math.max(room, 0));
    const added: Pending[] = files.map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      return {
        key: `${file.name}-${file.size}-${Math.random()}`,
        name: file.name,
        url,
        file: null,
        width: null,
        height: null,
        problem: null,
      };
    });
    setItems((current) => [...current, ...added]);
    for (const [index, item] of added.entries()) {
      const prepared = await prepareImageFile(files[index]!);
      setItems((current) =>
        current.map((entry) =>
          entry.key !== item.key
            ? entry
            : typeof prepared === 'string'
              ? { ...entry, problem: prepared }
              : {
                  ...entry,
                  file: prepared.file,
                  width: prepared.width,
                  height: prepared.height,
                },
        ),
      );
    }
  }

  function move(index: number, by: -1 | 1) {
    setItems((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item!);
      return next;
    });
  }

  function remove(key: string) {
    setOverflow(false);
    setItems((current) => current.filter((item) => item.key !== key));
  }

  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((item, index) => (
            <li key={item.key} className="space-y-1.5">
              <div className="relative overflow-hidden rounded-control border border-line bg-surface-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                <img
                  src={item.url}
                  alt={t('uploads.previewAlt', { name: item.name })}
                  className={cn(
                    'aspect-square w-full object-contain',
                    item.problem && 'opacity-50',
                  )}
                />
                {index === 0 && !item.problem ? (
                  <span className="absolute top-2 left-2 rounded-full bg-brand px-2 py-0.5 text-caption font-semibold text-fg-inverse">
                    {t('products.mainImage')}
                  </span>
                ) : null}
                {!item.file && !item.problem ? (
                  <span className="absolute inset-0 grid place-items-center bg-surface/50">
                    <Loader2 aria-hidden className="h-5 w-5 animate-spin text-fg" />
                  </span>
                ) : null}
              </div>
              <p className="truncate text-caption text-fg-subtle" title={item.name}>
                {item.name}
                {item.width && item.height ? ` · ${item.width}×${item.height}` : ''}
              </p>
              {item.problem ? (
                <p className="text-caption font-medium text-danger">{localProblem(item.problem)}</p>
              ) : null}
              <div className="flex">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className={iconButtonClasses('ghost', 'sm')}
                  aria-label={t('products.moveUp')}
                >
                  <ArrowLeft aria-hidden className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  className={iconButtonClasses('ghost', 'sm')}
                  aria-label={t('products.moveDown')}
                >
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.key)}
                  className={cn(iconButtonClasses('ghost', 'sm'), 'ml-auto')}
                  aria-label={t('uploads.removeChosen', { name: item.name })}
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {overflow ? (
        <p className="text-caption text-warning">{t('uploads.errors.too_many_images')}</p>
      ) : null}
      <div>
        <label
          htmlFor={inputId}
          className={buttonClasses(
            'secondary',
            'sm',
            cn(
              'cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
              items.length >= max && 'pointer-events-none opacity-50',
            ),
          )}
        >
          <Upload aria-hidden className="h-4 w-4" />
          {t('uploads.chooseImages')}
          <input
            id={inputId}
            type="file"
            accept={IMAGE_PICK}
            multiple
            disabled={items.length >= max}
            className="sr-only"
            onChange={(event) => {
              void choose(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
        <p className="mt-2 text-xs text-fg-subtle">
          {t('products.imagesHint')} {t('uploads.withProduct')}
        </p>
      </div>
    </div>
  );
}
