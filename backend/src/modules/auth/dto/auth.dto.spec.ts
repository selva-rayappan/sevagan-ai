import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './auth.dto';

describe('Auth DTO validation', () => {
  describe('LoginDto', () => {
    it('accepts a valid email and non-empty password', async () => {
      const dto = plainToInstance(LoginDto, { email: 'admin@sevagan.in', password: 'secret' });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('rejects an invalid email format', async () => {
      const dto = plainToInstance(LoginDto, { email: 'not-an-email', password: 'secret' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects an empty password', async () => {
      const dto = plainToInstance(LoginDto, { email: 'admin@sevagan.in', password: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
