import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { GroupLinksService } from './group-links.service';
import { WHATSAPP_INVITE_URL_REGEX } from './dto/group-links.dto';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Controller('join')
export class PublicJoinController {
  constructor(private readonly groupLinksService: GroupLinksService) {}

  @Public()
  @Get(':slug/resolve')
  async resolveJson(@Param('slug') slug: string) {
    const data = await this.groupLinksService.resolvePublicRedirect(slug);
    return {
      success: true,
      data: {
        slug: data.slug,
        name: data.name,
        available: data.available,
        inviteUrl: data.inviteUrl,
        groupName: data.groupName,
        participantCount: data.participantCount,
        maxParticipants: data.maxParticipants,
        message: data.message,
      },
    };
  }

  @Public()
  @Get(':slug')
  async redirectToGroup(@Param('slug') slug: string, @Res() res: Response) {
    const resolved = await this.groupLinksService.resolvePublicRedirect(slug);

    if (
      resolved.available &&
      resolved.inviteUrl &&
      WHATSAPP_INVITE_URL_REGEX.test(resolved.inviteUrl)
    ) {
      return res.redirect(HttpStatus.FOUND, resolved.inviteUrl);
    }

    const safeName = escapeHtml(resolved.name);
    const safeMsg = escapeHtml(resolved.message);

    return res.status(HttpStatus.CONFLICT).type('html').send(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeName} - Grupos Lotados</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f9fafb; color: #111827; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; max-width: 440px; width: 100%; padding: 28px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    h1 { font-size: 18px; margin: 0 0 8px; }
    p { font-size: 14px; color: #4b5563; line-height: 1.5; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${safeName}</h1>
    <p>${safeMsg}</p>
  </div>
</body>
</html>`);
  }
}
