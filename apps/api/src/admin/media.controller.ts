import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminMediaListQuerySchema,
  idSchema,
  mediaDirectUploadCompleteSchema,
  mediaDirectUploadSchema,
  mediaReorderSchema,
  mediaUpsertSchema,
  type AdminDirectUpload,
  type AdminMediaItem,
  type AdminMediaUploadLimits,
} from '@teran/contracts';
import type { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import { ApiException } from '../common/errors/api-exception.js';
import { CurrentActor, type Actor } from './admin-support.js';
import { AdminMediaService, MAX_VIDEO_UPLOAD_BYTES } from './media.service.js';

type MediaPayload = z.output<typeof mediaUpsertSchema>;

@ApiTags('admin')
@Controller('admin/media')
@RequireStaff()
export class AdminMediaController {
  constructor(private readonly media: AdminMediaService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'AdminMediaItem[] in display order (one kind, or all)' })
  list(
    @Query({ schema: adminMediaListQuerySchema }) query: z.output<typeof adminMediaListQuerySchema>,
  ): Promise<AdminMediaItem[]> {
    return this.media.list(query.kind);
  }

  @Get('upload-limits')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'How large a film can be uploaded, through the API or straight to storage',
  })
  @ApiOkResponse({ description: 'AdminMediaUploadLimits' })
  uploadLimits(): AdminMediaUploadLimits {
    return this.media.uploadLimits();
  }

  @Put('order')
  @ApiOperation({ summary: "Set one kind's display order (every item of that kind once)" })
  @ApiOkResponse({ description: 'AdminMediaItem[]' })
  reorder(
    @Body({ schema: mediaReorderSchema }) body: z.output<typeof mediaReorderSchema>,
    @CurrentActor() actor: Actor,
  ): Promise<AdminMediaItem[]> {
    return this.media.reorder(body.kind, body.ids, actor);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'AdminMediaItem' })
  get(@Param('id', { schema: idSchema }) id: string): Promise<AdminMediaItem> {
    return this.media.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a media item (saved as a draft until its image is uploaded)' })
  @ApiOkResponse({ description: 'AdminMediaItem' })
  create(
    @Body({ schema: mediaUpsertSchema }) body: MediaPayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminMediaItem> {
    return this.media.save(null, body, actor);
  }

  @Put(':id')
  @ApiOkResponse({ description: 'AdminMediaItem' })
  update(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: mediaUpsertSchema }) body: MediaPayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminMediaItem> {
    return this.media.save(id, body, actor);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a media item and its files' })
  async remove(
    @Param('id', { schema: idSchema }) id: string,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    await this.media.remove(id, actor);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload the photograph or the video poster (JPEG, PNG, WebP or AVIF)',
    description: 'Re-encoded to WebP at fixed widths, like product images.',
  })
  @ApiOkResponse({ description: 'AdminMediaItem' })
  setImage(
    @Param('id', { schema: idSchema }) id: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @CurrentActor() actor: Actor,
  ): Promise<AdminMediaItem> {
    if (!file) throw ApiException.badRequest('BAD_REQUEST', 'Attach an image in the "file" field');
    return this.media.setImage(id, file.buffer, actor);
  }

  @Post(':id/video')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_VIDEO_UPLOAD_BYTES, files: 1, fields: 5 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload the video file (MP4 or WebM, up to 64 MB)',
    description: 'Kept as uploaded; recognised by its first bytes, not its declared type.',
  })
  @ApiOkResponse({ description: 'AdminMediaItem' })
  setVideo(
    @Param('id', { schema: idSchema }) id: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @CurrentActor() actor: Actor,
  ): Promise<AdminMediaItem> {
    if (!file) throw ApiException.badRequest('BAD_REQUEST', 'Attach a video in the "file" field');
    return this.media.setVideo(id, file.buffer, actor);
  }

  @Post(':id/video/direct')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Permission to upload the video file straight to object storage',
    description:
      'Returns a short-lived token for one file of the stated type and size; 409 with reason ' +
      'direct_upload_unavailable when no object storage is configured.',
  })
  @ApiOkResponse({ description: 'AdminDirectUpload' })
  startDirectVideo(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: mediaDirectUploadSchema }) body: z.output<typeof mediaDirectUploadSchema>,
  ): Promise<AdminDirectUpload> {
    return this.media.startDirectVideo(id, body);
  }

  @Post(':id/video/direct/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check and record a video file uploaded straight to storage' })
  @ApiOkResponse({ description: 'AdminMediaItem' })
  completeDirectVideo(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: mediaDirectUploadCompleteSchema })
    body: z.output<typeof mediaDirectUploadCompleteSchema>,
    @CurrentActor() actor: Actor,
  ): Promise<AdminMediaItem> {
    return this.media.completeDirectVideo(id, body.pathname, actor);
  }

  @Post(':id/captions')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "Upload a film's subtitles (WebVTT, at most 512 KB)" })
  @ApiOkResponse({ description: 'AdminMediaItem' })
  setCaptions(
    @Param('id', { schema: idSchema }) id: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @CurrentActor() actor: Actor,
  ): Promise<AdminMediaItem> {
    if (!file) throw ApiException.badRequest('BAD_REQUEST', 'Attach a file in the "file" field');
    return this.media.setCaptions(id, file.buffer, actor);
  }

  @Delete(':id/captions')
  @ApiOkResponse({ description: 'AdminMediaItem' })
  removeCaptions(
    @Param('id', { schema: idSchema }) id: string,
    @CurrentActor() actor: Actor,
  ): Promise<AdminMediaItem> {
    return this.media.removeCaptions(id, actor);
  }
}
