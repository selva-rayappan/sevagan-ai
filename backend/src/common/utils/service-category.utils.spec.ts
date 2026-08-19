import { getServiceCategoryLabel } from './service-category.utils';
import { Language } from '../../domain/enums';

describe('getServiceCategoryLabel', () => {
  it('returns the English name for EN', () => {
    const category = { name: 'Electrical', nameTa: 'மின்சாரம்' };
    expect(getServiceCategoryLabel(category, Language.EN)).toBe('Electrical');
  });

  it('returns the Tamil name for TA when set', () => {
    const category = { name: 'Electrical', nameTa: 'மின்சாரம்' };
    expect(getServiceCategoryLabel(category, Language.TA)).toBe('மின்சாரம்');
  });

  it('falls back to the English name for TA when nameTa is null', () => {
    const category = { name: 'Acting Driver', nameTa: null };
    expect(getServiceCategoryLabel(category, Language.TA)).toBe('Acting Driver');
  });

  it('falls back to the English name for TA when nameTa is undefined', () => {
    const category = { name: 'Acting Driver' };
    expect(getServiceCategoryLabel(category, Language.TA)).toBe('Acting Driver');
  });

  it('falls back to the English name for TA when nameTa is an empty string', () => {
    const category = { name: 'Acting Driver', nameTa: '' };
    expect(getServiceCategoryLabel(category, Language.TA)).toBe('Acting Driver');
  });
});
