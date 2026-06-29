import { AttachmentType } from '@asset-manager/domain';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink } from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  resolve,
  sep,
} from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import type { MultipartFile } from '@fastify/multipart';
import { and, desc, eq } from 'drizzle-orm';
import { AppConfigService } from '../config/app-config.service';
import { DATABASE } from '../database/database.constants';
import type { AppDatabase } from '../database/database.types';
import { assetAttachments } from '../database/schema';
import { AssetsService } from './assets.service';

@Injectable()
export class AttachmentsService {
  constructor(
    @Inject(DATABASE) private readonly db: AppDatabase,
    private readonly assetsService: AssetsService,
    private readonly config: AppConfigService,
  ) {}

  list(userId: string, assetId: string) {
    this.assetsService.requireOwned(userId, assetId);
    return this.db
      .select({
        id: assetAttachments.id,
        userId: assetAttachments.userId,
        assetId: assetAttachments.assetId,
        fileName: assetAttachments.fileName,
        mimeType: assetAttachments.mimeType,
        fileSize: assetAttachments.fileSize,
        url: assetAttachments.url,
        type: assetAttachments.type,
        createdAt: assetAttachments.createdAt,
      })
      .from(assetAttachments)
      .where(
        and(
          eq(assetAttachments.assetId, assetId),
          eq(assetAttachments.userId, userId),
        ),
      )
      .orderBy(desc(assetAttachments.createdAt))
      .all();
  }

  async upload(
    userId: string,
    assetId: string,
    file: MultipartFile | undefined,
  ) {
    this.assetsService.requireOwned(userId, assetId);
    if (!file) throw new BadRequestException('请选择要上传的文件');
    const type = readAttachmentType(file.fields.type);
    const id = randomUUID();
    const extension = sanitizeExtension(file.filename);
    const relativePath = `${userId}/${assetId}/${id}${extension}`;
    const uploadRoot = isAbsolute(this.config.uploadDir)
      ? resolve(this.config.uploadDir)
      : resolve(process.cwd(), this.config.uploadDir);
    const absolutePath = resolve(uploadRoot, relativePath);
    if (!absolutePath.startsWith(`${uploadRoot}${sep}`)) {
      throw new BadRequestException('无效的附件路径');
    }
    await mkdir(dirname(absolutePath), { recursive: true });
    try {
      await pipeline(
        file.file,
        createWriteStream(absolutePath, { flags: 'wx' }),
      );
      const fileSize = file.file.bytesRead;
      const record = this.db
        .insert(assetAttachments)
        .values({
          id,
          userId,
          assetId,
          fileName: basename(file.filename),
          mimeType: file.mimetype,
          fileSize,
          storagePath: relativePath.replaceAll('\\', '/'),
          type,
          createdAt: new Date().toISOString(),
        })
        .returning()
        .get();
      return {
        id: record.id,
        userId: record.userId,
        assetId: record.assetId,
        fileName: record.fileName,
        mimeType: record.mimeType,
        fileSize: record.fileSize,
        url: record.url,
        type: record.type,
        createdAt: record.createdAt,
      };
    } catch (error) {
      await unlink(absolutePath).catch(() => undefined);
      throw error;
    }
  }

  async delete(
    userId: string,
    assetId: string,
    attachmentId: string,
  ): Promise<void> {
    this.assetsService.requireOwned(userId, assetId);
    const record = this.db
      .select()
      .from(assetAttachments)
      .where(
        and(
          eq(assetAttachments.id, attachmentId),
          eq(assetAttachments.assetId, assetId),
          eq(assetAttachments.userId, userId),
        ),
      )
      .get();
    if (!record) throw new NotFoundException('附件不存在');
    const uploadRoot = isAbsolute(this.config.uploadDir)
      ? resolve(this.config.uploadDir)
      : resolve(process.cwd(), this.config.uploadDir);
    const absolutePath = resolve(uploadRoot, record.storagePath);
    if (!absolutePath.startsWith(`${uploadRoot}${sep}`)) {
      throw new BadRequestException('无效的附件路径');
    }
    await unlink(absolutePath).catch((error: unknown) => {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      )) {
        throw error;
      }
    });
    this.db
      .delete(assetAttachments)
      .where(
        and(
          eq(assetAttachments.id, attachmentId),
          eq(assetAttachments.assetId, assetId),
          eq(assetAttachments.userId, userId),
        ),
      )
      .run();
  }
}

function sanitizeExtension(fileName: string): string {
  const extension = extname(basename(fileName)).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : '';
}

function readAttachmentType(field: unknown): AttachmentType {
  if (typeof field !== 'object' || field === null || !('value' in field)) {
    return AttachmentType.OTHER;
  }
  const value = String(field.value);
  return Object.values(AttachmentType).includes(value as AttachmentType)
    ? (value as AttachmentType)
    : AttachmentType.OTHER;
}
