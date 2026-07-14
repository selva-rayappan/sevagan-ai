import { registerDecorator, ValidationOptions } from 'class-validator';

const INDIAN_PHONE_PATTERN = /^(\+91|91)?[6-9]\d{9}$/;

export function IsIndianPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIndianPhone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && INDIAN_PHONE_PATTERN.test(value);
        },
        defaultMessage(): string {
          return 'phone must be a valid Indian mobile number (E.164, e.g. +919876543210)';
        },
      },
    });
  };
}
