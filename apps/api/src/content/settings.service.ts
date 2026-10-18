import { Injectable, Logger } from '@nestjs/common';
import {
  announcementSettingSchema,
  contactSettingSchema,
  storePictureSlot,
  storesSettingSchema,
  visualsSettingSchema,
  type AnnouncementSetting,
  type ContactSetting,
  type ImageDto,
  type Locale,
  type PublicFilmDto,
  type PublicSettingsDto,
  type SettingKey,
  type StoresSetting,
  type VisualsSetting,
} from '@teran/contracts';
import { PUBLIC_UPLOADS_PATH } from '../catalog/catalog.mapper.js';
import {
  filmCopyFileName,
  PRODUCT_FILM_MASK_FILE,
  videoFileName,
} from '../media/image-processing.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const EMPTY_CONTACT: ContactSetting = {
  phone: null,
  phone2: null,
  email: null,
  email2: null,
  telegram: null,
  instagram: null,
  whatsapp: null,
  youtube: null,
  address: null,
  workingHours: null,
};

const SCHEMAS = {
  announcement: announcementSettingSchema,
  contact: contactSettingSchema,
  stores: storesSettingSchema,
  visuals: visualsSettingSchema,
} as const;

export interface SettingValues {
  announcement: AnnouncementSetting | null;
  contact: ContactSetting;
  /** Points of sale on the store locator (Admin → Settings → Stores). */
  stores: StoresSetting;
  /** Page pictures by place (Admin → Settings → Page pictures). */
  visuals: VisualsSetting;
}

/**
 * A place's film as the storefront plays it: the file's address, its copies by width (narrowest
 * first, the file itself among them) and how it loops.
 */
export function visualVideo(video: VisualsSetting[string]['video']): PublicFilmDto | null {
  if (!video) return null;
  const { key, mask, widths, ...play } = video;
  const base = `${PUBLIC_UPLOADS_PATH}/${key}`;
  const src = `${base}/${videoFileName(video.type)}`;
  const copies = widths.map((width) => ({ src: `${base}/${filmCopyFileName(width)}`, width }));
  const sources =
    copies.length > 0
      ? [...(video.width ? [{ src, width: video.width }] : []), ...copies]
          .filter(
            (copy, index, all) => all.findIndex((other) => other.width === copy.width) === index,
          )
          .sort((a, b) => a.width - b.width)
      : [];
  return {
    src,
    ...play,
    mask: mask ? `${base}/${PRODUCT_FILM_MASK_FILE}` : null,
    sources,
  };
}

/** A stored page picture as an image the storefront can render (decorative: no alt text). */
export function visualImage(picture: VisualsSetting[string]['image']): ImageDto {
  return {
    src: `${PUBLIC_UPLOADS_PATH}/${picture.key}`,
    widths: picture.widths,
    width: picture.width,
    height: picture.height,
    alt: '',
    transparent: false,
  };
}

/** A WhatsApp setting as a link: kept when it is a wa.me link, built from the digits otherwise. */
export function whatsappLink(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith('https://wa.me/')) return value;
  const digits = value.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<SettingValues> {
    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { in: ['announcement', 'contact', 'stores', 'visuals'] } },
    });
    const read = <K extends keyof typeof SCHEMAS>(key: K) => {
      const row = rows.find((candidate) => candidate.key === key);
      if (!row) return null;
      const parsed = SCHEMAS[key].safeParse(row.value);
      if (!parsed.success) {
        // Never break the storefront because of a malformed setting; surface it in logs instead.
        this.logger.warn({ key }, 'Ignoring invalid site setting');
        return null;
      }
      return parsed.data;
    };
    return {
      announcement: read('announcement') as AnnouncementSetting | null,
      contact: (read('contact') as ContactSetting | null) ?? EMPTY_CONTACT,
      stores: (read('stores') as StoresSetting | null) ?? [],
      visuals: this.readVisuals(rows.find((row) => row.key === 'visuals')?.value),
    };
  }

  /**
   * Page pictures place by place: a place this build does not know (data saved by a newer one) or
   * a damaged entry is left out on its own, instead of taking every picture with it.
   */
  private readVisuals(value: unknown): VisualsSetting {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const visuals: VisualsSetting = {};
    for (const [slot, entry] of Object.entries(value as Record<string, unknown>)) {
      const parsed = visualsSettingSchema.safeParse({ [slot]: entry });
      if (parsed.success) Object.assign(visuals, parsed.data);
      else this.logger.warn({ slot }, 'Ignoring invalid page picture');
    }
    return visuals;
  }

  async getPublic(locale: Locale): Promise<PublicSettingsDto> {
    const { announcement, contact, stores, visuals } = await this.getAll();
    const localized = (value: Record<Locale, string> | null) => {
      const text = value?.[locale]?.trim() || value?.uz?.trim();
      return text ? text : null;
    };
    const announcementText = announcement?.enabled ? localized(announcement.text) : null;
    return {
      announcement: announcementText
        ? { text: announcementText, href: announcement?.href ?? null }
        : null,
      contact: {
        phone: contact.phone,
        phone2: contact.phone2,
        email: contact.email,
        email2: contact.email2,
        telegram: contact.telegram,
        instagram: contact.instagram,
        whatsapp: whatsappLink(contact.whatsapp),
        youtube: contact.youtube,
        address: localized(contact.address),
        workingHours: localized(contact.workingHours),
      },
      visuals: Object.fromEntries(
        Object.entries(visuals).map(([slot, visual]) => [
          slot,
          {
            image: visualImage(visual.image),
            mobile: visual.mobile ? visualImage(visual.mobile) : null,
            video: visualVideo(visual.video),
            mobileVideo: visualVideo(visual.mobileVideo),
          },
        ]),
      ),
      stores: stores
        .filter((store) => store.active)
        .map((store) => {
          const picture = visuals[storePictureSlot(store.id)];
          return {
            id: store.id,
            name: store.name,
            address: localized(store.address) ?? '',
            hours: localized(store.hours),
            phone: store.phone,
            latitude: store.latitude,
            longitude: store.longitude,
            kinds: store.kinds,
            image: picture ? visualImage(picture.image) : null,
          };
        }),
    };
  }

  async update(
    key: SettingKey | 'visuals',
    value: AnnouncementSetting | ContactSetting | StoresSetting | VisualsSetting,
    actorUserId: string,
  ): Promise<void> {
    const json = value as unknown as Prisma.InputJsonValue;
    await this.prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: json, updatedById: actorUserId },
      update: { value: json, updatedById: actorUserId },
    });
  }
}
