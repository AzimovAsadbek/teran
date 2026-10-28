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
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  adminMediaListQuerySchema,
  idSchema,
  mediaReorderSchema,
  mediaUploadChunkQuerySchema,
  mediaUploadStartSchema,
  mediaUpsertSchema,
  type AdminMediaItem,
  type MediaUploadSession,
} from '@teran/contracts';
import type { Request } from 'express';
import { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import { ApiException } from '../common/errors/api-exception.js';
import { CurrentActor, type Actor } from './admin-support.js';
import { MediaUploadsService, UPLOAD_ID_PATTERN } from './media-uploads.service.js';
import { AdminMediaService } from './media.service.js';

type MediaPayload = z.output<typeof mediaUpsertSchema>;

const uploadIdSchema = z.string().regex(UPLOAD_ID_PATTERN);

@ApiTags('admin')
@Controller('admin/media')
@RequireStaff()
export class AdminMediaController {
  constructor(
    private readonly media: AdminMediaService,
    private readonly uploads: MediaUploadsService,
  ) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'AdminMediaItem[] in display order (one kind, or all)' })
  list(
    @Query({ schema: adminMediaListQuerySchema }) query: z.output<typeof adminMediaListQuerySchema>,
  ): Promise<AdminMediaItem[]> {
    return this.media.list(query.kind);
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

  @Post(':id/video/uploads')
  @ApiOperation({
    summary: "Start a film's upload in pieces (MP4 or WebM, any size)",
    description:
      'Answers the upload id and the piece size; refused with 507 when the server has not the room.',
  })
  @ApiOkResponse({ description: 'MediaUploadSession' })
  startVideoUpload(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: mediaUploadStartSchema }) body: z.output<typeof mediaUploadStartSchema>,
  ): Promise<MediaUploadSession> {
    return this.media.startVideoUpload(id, body.size);
  }

  @Get(':id/video/uploads/:uploadId')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'How much of a film the API has (to go on after a lost connection)' })
  @ApiOkResponse({ description: 'MediaUploadSession' })
  videoUploadStatus(
    @Param('id', { schema: idSchema }) id: string,
    @Param('uploadId', { schema: uploadIdSchema }) uploadId: string,
  ): Promise<MediaUploadSession> {
    return this.uploads.status(id, uploadId);
  }

  @Put(':id/video/uploads/:uploadId')
  // A film of a few gigabytes is hundreds of pieces; the rest of the API keeps its limit.
  @Throttle({ default: { limit: 600, ttl: 60_000 } })
  @ApiConsumes('application/octet-stream')
  @ApiOperation({
    summary: "Add the piece of a film that starts at ?offset= (the request's body, raw bytes)",
    description:
      'Accepted only where the file ends; otherwise 409 with `received`, where the next piece starts.',
  })
  @ApiOkResponse({ description: 'MediaUploadSession' })
  appendVideoUpload(
    @Param('id', { schema: idSchema }) id: string,
    @Param('uploadId', { schema: uploadIdSchema }) uploadId: string,
    @Query({ schema: mediaUploadChunkQuerySchema })
    query: z.output<typeof mediaUploadChunkQuerySchema>,
    @Req() request: Request,
  ): Promise<MediaUploadSession> {
    if (!request.is('application/octet-stream')) {
      throw ApiException.badRequest('BAD_REQUEST', 'Send the piece as application/octet-stream');
    }
    return this.uploads.append(id, uploadId, query.offset, request);
  }

  @Post(':id/video/uploads/:uploadId/complete')
  @ApiOperation({
    summary: "Keep a fully uploaded film as the item's file",
    description:
      'Recognised by its first bytes, not its declared type; kept as uploaded. Asked again while ' +
      'the film is being stored, it waits for that work; once stored, the upload is gone (404).',
  })
  @ApiOkResponse({ description: 'AdminMediaItem' })
  completeVideoUpload(
    @Param('id', { schema: idSchema }) id: string,
    @Param('uploadId', { schema: uploadIdSchema }) uploadId: string,
    @CurrentActor() actor: Actor,
  ): Promise<AdminMediaItem> {
    return this.media.setVideoFromUpload(id, uploadId, actor);
  }

  @Delete(':id/video/uploads/:uploadId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Cancel an upload and remove what was sent',
    description: 'Refused with 409 `upload_storing` while the finished film is being stored.',
  })
  cancelVideoUpload(
    @Param('id', { schema: idSchema }) id: string,
    @Param('uploadId', { schema: uploadIdSchema }) uploadId: string,
  ): Promise<void> {
    return this.media.cancelVideoUpload(id, uploadId);
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
