import { Injectable, Logger } from '@nestjs/common';
import {
  announcementSettingSchema,
  contactSettingSchema,
  type AnnouncementSetting,
  type ContactSetting,
  type Locale,
  type PublicSettingsDto,
  type SettingKey,
} from '@teran/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const EMPTY_CONTACT: ContactSetting = {
  phone: null,
  email: null,
  telegram: null,
  instagram: null,
  address: null,
  workingHours: null,
};

const SCHEMAS = { announcement: announcementSettingSchema, contact: contactSettingSchema } as const;

export interface SettingValues {
  announcement: AnnouncementSetting | null;
  contact: ContactSetting;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<SettingValues> {
    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { in: ['announcement', 'contact'] } },
    });
    const read = <K extends SettingKey>(key: K) => {
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
    };
  }

  async getPublic(locale: Locale): Promise<PublicSettingsDto> {
    const { announcement, contact } = await this.getAll();
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
        email: contact.email,
        telegram: contact.telegram,
        instagram: contact.instagram,
        address: localized(contact.address),
        workingHours: localized(contact.workingHours),
      },
    };
  }

  async update(
    key: SettingKey,
    value: AnnouncementSetting | ContactSetting,
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
