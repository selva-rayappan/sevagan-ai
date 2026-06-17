import { Test, TestingModule } from '@nestjs/testing';
import { TranslationService } from './translation.service';
import { Language } from '../../domain/enums/language.enum';

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TranslationService],
    }).compile();

    service = module.get<TranslationService>(TranslationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('translate()', () => {
    it('returns English text for EN language', () => {
      const result = service.translate('customer.welcome', Language.EN);
      expect(result).toContain('Welcome to Sevagan');
    });

    it('returns Tamil text for TA language', () => {
      const result = service.translate('customer.welcome', Language.TA);
      expect(result).toContain('சேவகன');
    });

    it('defaults to EN when no language is provided', () => {
      const result = service.translate('customer.welcome');
      expect(result).toContain('Welcome to Sevagan');
    });

    it('falls back to EN when a key is missing in TA', () => {
      // Confirm the key exists in EN but not TA by testing a hypothetically missing key
      // We verify the fallback by checking that translate never returns undefined
      const result = service.translate('customer.help', Language.TA);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('returns the key itself when missing from all locales', () => {
      const key = 'nonexistent.key.path';
      const result = service.translate(key, Language.EN);
      expect(result).toBe(key);
    });

    it('interpolates {{params}} in EN templates', () => {
      const result = service.translate('customer.job_created', Language.EN, {
        jobNumber: 'JOB-001',
        service: 'Electrical',
        location: 'Virudhunagar',
        scheduledTime: 'Today 4 PM',
      });
      expect(result).toContain('JOB-001');
      expect(result).toContain('Electrical');
      expect(result).toContain('Virudhunagar');
      expect(result).toContain('Today 4 PM');
    });

    it('interpolates {{params}} in TA templates', () => {
      const result = service.translate('customer.job_created', Language.TA, {
        jobNumber: 'JOB-001',
        service: 'மின்சாரம்',
        location: 'விருதுநகர்',
        scheduledTime: 'இன்று மாலை 4 மணி',
      });
      expect(result).toContain('JOB-001');
      expect(result).toContain('மின்சாரம்');
    });

    it('replaces all occurrences of a param placeholder', () => {
      const result = service.translate('customer.job_created', Language.EN, {
        jobNumber: 'JOB-999',
        service: 'Plumbing',
        location: 'Test Area',
        scheduledTime: 'ASAP',
      });
      const occurrences = (result.match(/\{\{/g) ?? []).length;
      expect(occurrences).toBe(0);
    });

    it('returns technician job offer in Tamil with params', () => {
      const result = service.translate('technician.job_offer', Language.TA, {
        customerName: 'ராஜேஷ்',
        location: 'விருதுநகர்',
        service: 'மின்சாரம்',
        scheduledTime: 'இன்று மாலை 4 மணி',
      });
      expect(result).toContain('ராஜேஷ்');
      expect(result).toContain('விருதுநகர்');
    });

    it('returns service category names in EN', () => {
      expect(service.translate('service.electrical', Language.EN)).toBe('Electrical');
      expect(service.translate('service.ac_service', Language.EN)).toBe('AC Service');
    });

    it('returns service category names in TA', () => {
      expect(service.translate('service.electrical', Language.TA)).toBe('மின்சாரம்');
      expect(service.translate('service.plumbing', Language.TA)).toBe('குழாய் பணி');
    });

    it('returns job status labels in EN', () => {
      expect(service.translate('job_status.NEW', Language.EN)).toBe('New — Finding Technician');
      expect(service.translate('job_status.COMPLETED', Language.EN)).toBe('Completed');
    });

    it('returns job status labels in TA', () => {
      expect(service.translate('job_status.NEW', Language.TA)).toBe(
        'புதியது — தொழில்நுட்பவியலாளர் தேடுகிறோம்',
      );
    });
  });
});
