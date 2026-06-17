import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { WhatsAppProvider } from './whatsapp.provider.interface';
import {
  SendImageOptions,
  SendInteractiveButtonsOptions,
  SendInteractiveListOptions,
  SendTextOptions,
} from './types/outbound-message.types';

const GRAPH_API_VERSION = 'v20.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

@Injectable()
export class MetaWhatsAppProvider implements WhatsAppProvider {
  private readonly logger = new Logger(MetaWhatsAppProvider.name);
  protected readonly client: AxiosInstance;
  protected readonly accessToken: string;

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('whatsapp.accessToken', '');
    const phoneNumberId = this.configService.get<string>('whatsapp.phoneNumberId', '');

    this.client = axios.create({
      baseURL: `${GRAPH_API_BASE}/${phoneNumberId}`,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    });
  }

  async sendText({ to, text }: SendTextOptions): Promise<void> {
    await this.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text },
    });
  }

  async sendInteractiveButtons({
    to,
    body,
    buttons,
    footer,
  }: SendInteractiveButtonsOptions): Promise<void> {
    if (buttons.length > 3) {
      throw new Error('WhatsApp interactive buttons are limited to 3');
    }

    await this.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        ...(footer && { footer: { text: footer } }),
        action: {
          buttons: buttons.map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title.substring(0, 20) },
          })),
        },
      },
    });
  }

  async sendInteractiveList({
    to,
    headerText,
    body,
    buttonText,
    sections,
    footer,
  }: SendInteractiveListOptions): Promise<void> {
    await this.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: { type: 'text', text: headerText },
        body: { text: body },
        ...(footer && { footer: { text: footer } }),
        action: {
          button: buttonText.substring(0, 20),
          sections,
        },
      },
    });
  }

  async sendImage({ to, mediaId, caption }: SendImageOptions): Promise<void> {
    await this.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: { id: mediaId, ...(caption && { caption }) },
    });
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.post('/messages', {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  }

  async downloadMedia(mediaId: string): Promise<Buffer> {
    const headers = { Authorization: `Bearer ${this.accessToken}` };

    const metaResponse = await axios.get<{ url: string }>(
      `${GRAPH_API_BASE}/${mediaId}`,
      { headers, timeout: 10_000 },
    );

    const mediaResponse = await axios.get<ArrayBuffer>(metaResponse.data.url, {
      headers,
      responseType: 'arraybuffer',
      timeout: 30_000,
    });

    return Buffer.from(mediaResponse.data);
  }

  private async post(path: string, data: unknown): Promise<void> {
    try {
      await this.client.post(path, data);
    } catch (err) {
      const axiosError = err as AxiosError;
      const status = axiosError.response?.status;
      const detail = JSON.stringify(axiosError.response?.data ?? axiosError.message);
      this.logger.error(`Meta API error [${status}]: ${detail}`);
      throw err;
    }
  }
}
