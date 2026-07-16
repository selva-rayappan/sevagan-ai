import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCustomerDto } from './customers.dto';
import { ResolveDisputeDto } from './disputes.dto';
import { ManualAssignDto } from './jobs.dto';
import { GenerateSettlementDto } from './settlements.dto';
import { CreateCommissionRuleDto } from './commission.dto';
import { AddSkillDto, CreateTechnicianDto, UpdateTechnicianDto } from './technicians.dto';
import { PaymentMode, CommissionType, TechnicianStatus } from '../../../domain/enums';

describe('Admin DTO validation', () => {
  describe('UpdateCustomerDto', () => {
    it('accepts a valid partial update', async () => {
      const dto = plainToInstance(UpdateCustomerDto, { name: 'Rajesh' });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('rejects a non-string name', async () => {
      const dto = plainToInstance(UpdateCustomerDto, { name: 12345 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ResolveDisputeDto', () => {
    it('accepts an empty body since notes is optional', async () => {
      const dto = plainToInstance(ResolveDisputeDto, {});
      expect(await validate(dto)).toHaveLength(0);
    });

    it('rejects notes longer than 1000 characters', async () => {
      const dto = plainToInstance(ResolveDisputeDto, { notes: 'x'.repeat(1001) });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ManualAssignDto', () => {
    it('accepts a valid UUID', async () => {
      const dto = plainToInstance(ManualAssignDto, { technicianId: '550e8400-e29b-41d4-a716-446655440000' });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('rejects a non-UUID technicianId', async () => {
      const dto = plainToInstance(ManualAssignDto, { technicianId: 'not-a-uuid' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('GenerateSettlementDto', () => {
    it('accepts a valid payload', async () => {
      const dto = plainToInstance(GenerateSettlementDto, {
        technicianId: '550e8400-e29b-41d4-a716-446655440000',
        periodStart: '2026-06-01',
        periodEnd: '2026-06-30',
      });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('rejects an invalid date string', async () => {
      const dto = plainToInstance(GenerateSettlementDto, {
        technicianId: '550e8400-e29b-41d4-a716-446655440000',
        periodStart: 'not-a-date',
        periodEnd: '2026-06-30',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('CreateCommissionRuleDto', () => {
    it('accepts a valid payload', async () => {
      const dto = plainToInstance(CreateCommissionRuleDto, {
        paymentMode: PaymentMode.CASH,
        commissionType: CommissionType.FLAT,
        commissionValue: 20,
      });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('rejects an invalid paymentMode enum value', async () => {
      const dto = plainToInstance(CreateCommissionRuleDto, {
        paymentMode: 'BITCOIN',
        commissionType: CommissionType.FLAT,
        commissionValue: 20,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects a negative commissionValue', async () => {
      const dto = plainToInstance(CreateCommissionRuleDto, {
        paymentMode: PaymentMode.CASH,
        commissionType: CommissionType.FLAT,
        commissionValue: -5,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('CreateTechnicianDto', () => {
    it('accepts a valid payload', async () => {
      const dto = plainToInstance(CreateTechnicianDto, {
        name: 'Kumar',
        phone: '919876543210',
        address: 'Virudhunagar',
        serviceArea: 'Virudhunagar',
        categoryIds: ['550e8400-e29b-41d4-a716-446655440000'],
      });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('rejects a phone number that is too short', async () => {
      const dto = plainToInstance(CreateTechnicianDto, { name: 'Kumar', phone: '123', serviceArea: 'Virudhunagar' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects a non-UUID entry in categoryIds', async () => {
      const dto = plainToInstance(CreateTechnicianDto, {
        name: 'Kumar',
        phone: '919876543210',
        serviceArea: 'Virudhunagar',
        categoryIds: ['not-a-uuid'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('accepts a priorityRank within 0-100', async () => {
      const dto = plainToInstance(CreateTechnicianDto, {
        name: 'Kumar',
        phone: '919876543210',
        address: 'Virudhunagar',
        serviceArea: 'Virudhunagar',
        priorityRank: 80,
      });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('rejects a priorityRank outside 0-100', async () => {
      const dto = plainToInstance(CreateTechnicianDto, {
        name: 'Kumar',
        phone: '919876543210',
        serviceArea: 'Virudhunagar',
        priorityRank: 150,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateTechnicianDto', () => {
    it('accepts a valid status enum value', async () => {
      const dto = plainToInstance(UpdateTechnicianDto, { status: TechnicianStatus.AVAILABLE });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('rejects an invalid status value', async () => {
      const dto = plainToInstance(UpdateTechnicianDto, { status: 'ON_VACATION' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('accepts a valid priorityRank update', async () => {
      const dto = plainToInstance(UpdateTechnicianDto, { priorityRank: 25 });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('rejects a negative priorityRank', async () => {
      const dto = plainToInstance(UpdateTechnicianDto, { priorityRank: -1 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('AddSkillDto', () => {
    it('rejects a missing categoryId', async () => {
      const dto = plainToInstance(AddSkillDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
