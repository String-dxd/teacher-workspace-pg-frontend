import type { FormQuestion } from '~/data/posts-registry';

export const COMMENTS_MAX_LENGTH = 500;

export type ConsentType = 'YES' | 'NO';

/** Errors keyed by field: `consentType`, `comments`, or a question's `id`. */
export function computeReplyErrors(
  consentType: ConsentType | null,
  answers: Record<string, string>,
  questions: FormQuestion[],
  comments: string,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!consentType) {
    errors.consentType = 'Select Yes or No.';
  } else if (consentType === 'YES') {
    for (const q of questions) {
      if (!answers[q.id]?.trim()) errors[q.id] = 'Answer this question before saving.';
    }
  }

  if (comments.length > COMMENTS_MAX_LENGTH) {
    errors.comments = `Exceeded by ${comments.length - COMMENTS_MAX_LENGTH} characters.`;
  }

  return errors;
}

export function isReplyValid(
  consentType: ConsentType | null,
  answers: Record<string, string>,
  questions: FormQuestion[],
  comments: string,
): boolean {
  return Object.keys(computeReplyErrors(consentType, answers, questions, comments)).length === 0;
}
