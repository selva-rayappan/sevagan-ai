import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { MessageDirection, MessageTrailEntry } from './message-trail.types';

@Injectable()
export class MessageTrailService {
  private readonly logger = new Logger(MessageTrailService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.bucket = this.configService.get<string>('messageTrail.s3Bucket', 'sevagan-ai');
    this.client = new S3Client({ region: this.configService.get<string>('messageTrail.s3Region', 'us-east-1') });
  }

  /**
   * Fire-and-forget by design (callers use `void`) — a WhatsApp send or an
   * inbound webhook must never fail because the audit trail write did.
   * jobId is resolved here (rather than threaded through every business
   * service that sends a message) from whichever job the phone number is
   * currently attached to: a technician's most recent assignment, or a
   * customer's most recent job.
   */
  async record(phone: string, direction: MessageDirection, messageType: string, summary: string): Promise<void> {
    try {
      const jobId = await this.resolveJobId(phone);
      const entry: MessageTrailEntry = {
        id: randomUUID(),
        jobId,
        phone,
        direction,
        messageType,
        summary,
        timestamp: new Date().toISOString(),
      };
      const prefix = jobId ? `message-trails/job/${jobId}` : `message-trails/unassigned/${phone}`;
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: `${prefix}/${entry.timestamp}_${direction}_${entry.id}.json`,
          Body: JSON.stringify(entry),
          ContentType: 'application/json',
        }),
      );
    } catch (err) {
      this.logger.error(`Failed to record message trail for ${phone}: ${(err as Error).message}`);
    }
  }

  async listForJob(jobId: string): Promise<MessageTrailEntry[]> {
    const prefix = `message-trails/job/${jobId}/`;
    try {
      const list = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }));
      const keys = (list.Contents ?? []).map((obj) => obj.Key).filter((key): key is string => !!key);

      const entries = await Promise.all(
        keys.map(async (key) => {
          const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
          const body = await res.Body?.transformToString();
          return body ? (JSON.parse(body) as MessageTrailEntry) : null;
        }),
      );

      return entries
        .filter((entry): entry is MessageTrailEntry => entry !== null)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    } catch (err) {
      this.logger.error(`Failed to list message trail for job ${jobId}: ${(err as Error).message}`);
      return [];
    }
  }

  private async resolveJobId(phone: string): Promise<string | null> {
    const technician = await this.prisma.technician.findUnique({ where: { phone } });
    if (technician) {
      const assignment = await this.prisma.assignment.findFirst({
        where: { technicianId: technician.id },
        orderBy: { assignedAt: 'desc' },
      });
      return assignment?.jobId ?? null;
    }

    const customer = await this.prisma.customer.findUnique({ where: { phone } });
    if (customer) {
      const job = await this.prisma.job.findFirst({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
      });
      return job?.id ?? null;
    }

    return null;
  }
}
