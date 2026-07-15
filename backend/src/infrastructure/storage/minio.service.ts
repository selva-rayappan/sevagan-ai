import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const endpoint = this.configService.get<string>('minio.endpoint', 'localhost');
    const port = this.configService.get<number>('minio.port', 9000);
    const useSSL = this.configService.get<boolean>('minio.useSsl', false);
    const accessKey = this.configService.get<string>('minio.accessKey', 'minioadmin');
    const secretKey = this.configService.get<string>('minio.secretKey', 'minioadmin');
    this.bucketName = this.configService.get<string>('minio.bucketName', 'sevagan-uploads');

    this.client = new Minio.Client({ endPoint: endpoint, port, useSSL, accessKey, secretKey });

    await this.ensureBucket();
    this.logger.log(`MinIO connected — bucket: ${this.bucketName}`);
  }

  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    await this.client.putObject(this.bucketName, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    return `${this.bucketName}/${key}`;
  }

  async getPresignedUrl(key: string, expirySeconds = 86400): Promise<string> {
    return this.client.presignedGetObject(this.bucketName, key, expirySeconds);
  }

  /**
   * Fetches an object's bytes directly via the internal MinIO client — used to
   * proxy files (e.g. invoice PDFs) through our own API instead of exposing
   * presigned URLs built with MINIO_ENDPOINT, which is an internal Docker
   * hostname unreachable from outside the network.
   */
  async downloadFile(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucketName, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }

  private async ensureBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'ap-south-1');
        this.logger.log(`Created MinIO bucket: ${this.bucketName}`);
      }
    } catch (err) {
      this.logger.error(`MinIO bucket init error: ${(err as Error).message}`);
    }
  }
}
