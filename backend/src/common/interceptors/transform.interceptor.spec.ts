import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('wraps the response data in { data, timestamp }', (done) => {
    const payload = { id: '123', name: 'Test' };
    const mockCallHandler = { handle: () => of(payload) };
    const mockContext = {} as ExecutionContext;

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.data).toEqual(payload);
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
      done();
    });
  });

  it('wraps null data correctly', (done) => {
    const mockCallHandler = { handle: () => of(null) };
    const mockContext = {} as ExecutionContext;

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.data).toBeNull();
      expect(result.timestamp).toBeTruthy();
      done();
    });
  });

  it('wraps array data correctly', (done) => {
    const payload = [1, 2, 3];
    const mockCallHandler = { handle: () => of(payload) };
    const mockContext = {} as ExecutionContext;

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.data).toEqual([1, 2, 3]);
      done();
    });
  });
});
