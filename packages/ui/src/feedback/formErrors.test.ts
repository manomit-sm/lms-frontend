import { ApiError } from '@lms/api';
import { describe, expect, it, vi } from 'vitest';
import { applyFieldErrors } from './formErrors';

const problem = (body: object) =>
  ApiError.fromResponse(
    new Response(JSON.stringify(body), {
      status: 400,
      headers: { 'Content-Type': 'application/problem+json' },
    }),
  );

describe('applyFieldErrors', () => {
  it('sends field errors to their fields', async () => {
    const setErrors = vi.fn();
    const error = await problem({
      errorCode: 'VALIDATION_FAILED',
      detail: 'Some fields are invalid',
      errors: [{ field: 'code', message: 'must not be blank' }],
    });

    expect(applyFieldErrors(error, setErrors)).toBeNull();
    expect(setErrors).toHaveBeenCalledWith({ code: 'must not be blank' });
  });

  it('returns the detail of any other problem', async () => {
    const setErrors = vi.fn();
    const error = await problem({ errorCode: 'DEPARTMENT_CYCLE', detail: 'Can’t move it under itself' });

    expect(applyFieldErrors(error, setErrors)).toBe('Can’t move it under itself');
    expect(setErrors).not.toHaveBeenCalled();
  });
});
