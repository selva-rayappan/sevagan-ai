import { Language } from '../enums';

export interface CustomerEntity {
  id: string;
  name?: string | null;
  phone: string;
  address?: string | null;
  language: Language;
  createdAt: Date;
  updatedAt: Date;
}
