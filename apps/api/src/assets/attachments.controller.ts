import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { AttachmentsService } from './attachments.service';

@ApiTags('asset attachments')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('assets/:assetId/attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    return this.service.list(user.userId, assetId);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: {
          type: 'string',
          enum: ['IMAGE', 'INVOICE', 'WARRANTY', 'MANUAL', 'OTHER'],
        },
      },
    },
  })
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.service.upload(user.userId, assetId, await request.file());
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<void> {
    await this.service.delete(user.userId, assetId, attachmentId);
  }
}
