import { Global, Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { SessionService } from '../auth/session.service.js';
import { MailService } from '../mail/mail.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';

/** Cross-cutting services used by most feature modules. */
@Global()
@Module({
  providers: [AuditService, MailService, RevalidationService, SessionService],
  exports: [AuditService, MailService, RevalidationService, SessionService],
})
export class CoreModule {}
