import { ArgumentMetadata } from '@nestjs/common';
import { SanitizePipe } from './sanitize.pipe';

describe('SanitizePipe', () => {
  const pipe = new SanitizePipe();
  const bodyMeta: ArgumentMetadata = { type: 'body', metatype: undefined, data: undefined };
  const queryMeta: ArgumentMetadata = { type: 'query', metatype: undefined, data: undefined };

  it('trims and strips HTML tags from string fields', () => {
    const result = pipe.transform({ name: '  <b>Kumar</b>  ' }, bodyMeta) as any;
    expect(result.name).toBe('Kumar');
  });

  it('sanitizes nested objects and arrays', () => {
    const result = pipe.transform(
      { notes: ' hi <script>alert(1)</script> ', tags: [' <i>a</i> ', ' b '] },
      bodyMeta,
    ) as any;
    expect(result.notes).toBe('hi alert(1)');
    expect(result.tags).toEqual(['a', 'b']);
  });

  it('leaves non-string values untouched', () => {
    const result = pipe.transform({ amount: 100, active: true }, bodyMeta) as any;
    expect(result).toEqual({ amount: 100, active: true });
  });

  it('only sanitizes body parameters, not query/param', () => {
    const value = { name: '  <b>Kumar</b>  ' };
    expect(pipe.transform(value, queryMeta)).toBe(value);
  });
});
