import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { VoiceCallProvider, PlaceCallOptions } from './voice-call.provider.interface';
import { normalizePhone } from '../../common/utils/phone.utils';

const PLIVO_API_BASE = 'https://api.plivo.com/v1';

@Injectable()
export class PlivoVoiceCallProvider implements VoiceCallProvider {
  private readonly logger = new Logger(PlivoVoiceCallProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async placeCall({ to, answerUrl }: PlaceCallOptions): Promise<void> {
    const authId = this.configService.get<string>('voice.plivoAuthId', '');
    const authToken = this.configService.get<string>('voice.plivoAuthToken', '');
    const fromNumber = this.configService.get<string>('voice.plivoNumber', '');

    try {
      await axios.post(
        `${PLIVO_API_BASE}/Account/${authId}/Call/`,
        {
          from: normalizePhone(fromNumber),
          to: normalizePhone(to),
          answer_url: answerUrl,
          answer_method: 'GET',
        },
        {
          auth: { username: authId, password: authToken },
          timeout: 10_000,
        },
      );
    } catch (err) {
      const axiosError = err as AxiosError;
      const status = axiosError.response?.status;
      const detail = JSON.stringify(axiosError.response?.data ?? axiosError.message);
      this.logger.error(`Plivo call error [${status}] to ${to}: ${detail}`);
      throw err;
    }
  }
}
