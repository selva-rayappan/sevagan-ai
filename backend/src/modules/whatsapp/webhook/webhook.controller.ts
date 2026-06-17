import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  RawBody,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../auth/public.decorator';
import { WebhookHmacGuard } from '../guards/webhook-hmac.guard';
import {
  InboundWhatsAppMessage,
  WhatsAppWebhookPayload,
} from '../../../infrastructure/messaging/types/inbound-message.types';
import { CustomerBotService } from '../customer-bot/customer-bot.service';
import { TechnicianBotService } from '../technician-bot/technician-bot.service';
import { TechniciansRepository } from '../../technicians/technicians.repository';

@Public()
@ApiExcludeController()
@Controller('whatsapp/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly customerBotService: CustomerBotService,
    private readonly technicianBotService: TechnicianBotService,
    private readonly techniciansRepository: TechniciansRepository,
  ) {}

  /**
   * Meta hub verification handshake.
   * Called once when registering the webhook URL in Meta Developer Console.
   */
  @Get()
  @Version('1')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const verifyToken = this.configService.get<string>('whatsapp.webhookVerifyToken', '');

    if (mode !== 'subscribe' || token !== verifyToken) {
      this.logger.warn(`Webhook verification failed — mode: ${mode}, token mismatch`);
      throw new ForbiddenException('Webhook verification failed');
    }

    this.logger.log('WhatsApp webhook verified successfully');
    return challenge;
  }

  /**
   * Inbound message handler. Returns 200 immediately — routing is fire-and-forget.
   * Checks if sender is a registered technician; if not, routes to customer bot.
   */
  @Post()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookHmacGuard)
  handleWebhook(
    @Body() payload: WhatsAppWebhookPayload,
    @RawBody() _rawBody: Buffer,
  ): { status: string } {
    if (payload.object !== 'whatsapp_business_account') {
      throw new BadRequestException('Unsupported webhook object type');
    }

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;

        const { messages = [], statuses = [], contacts = [] } = change.value;

        for (const message of messages) {
          const senderName =
            contacts.find((c) => c.wa_id === message.from)?.profile.name ?? 'Unknown';
          this.dispatchMessage(message, senderName);
        }

        for (const status of statuses) {
          this.logger.debug(`Message ${status.id} status: ${status.status}`);
        }
      }
    }

    return { status: 'ok' };
  }

  private dispatchMessage(message: InboundWhatsAppMessage, senderName: string): void {
    this.routeMessage(message, senderName).catch((err: Error) => {
      this.logger.error(
        `Dispatch error [${message.from}]: ${err.message}`,
        err.stack,
      );
    });
  }

  private async routeMessage(message: InboundWhatsAppMessage, senderName: string): Promise<void> {
    const technician = await this.techniciansRepository.findByPhone(message.from);
    if (technician) {
      await this.technicianBotService.handleMessage(message, senderName, technician);
    } else {
      await this.customerBotService.handleMessage(message, senderName);
    }
  }
}
