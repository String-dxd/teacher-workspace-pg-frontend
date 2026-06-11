import { ValidationError } from '~/features/posts/api/errors';

export type PostFormField = 'title' | 'description' | 'enquiryEmail' | 'recipients' | 'dueDate';

export function reportValidationError(err: ValidationError): string {
  switch (err.resultCode) {
    case -4001:
      return 'Enquiry email is required.';
    case -4003:
      return 'Description formatting is invalid. Please simplify and try again.';
    case -4004:
      return 'Description is too long. Maximum 2000 characters.';
    default:
      return err.message;
  }
}

export function fieldForValidationError(err: ValidationError): PostFormField | undefined {
  if (err.fieldPath === 'title') return 'title';
  if (err.fieldPath === 'description' || err.fieldPath === 'richTextContent') return 'description';
  if (err.fieldPath === 'enquiryEmailAddress' || err.fieldPath === 'enquiryEmail') {
    return 'enquiryEmail';
  }
  switch (err.resultCode) {
    case -4001:
      return 'enquiryEmail';
    case -4003:
    case -4004:
      return 'description';
    default:
      return undefined;
  }
}
