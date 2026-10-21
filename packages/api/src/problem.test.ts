import { describe, expect, it } from 'vitest';
import { ApiError, errorMessage } from './problem';

const problem = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/problem+json' } });

describe('ApiError.fromResponse', () => {
  it('reads the code, detail and field errors of a validation problem', async () => {
    const error = await ApiError.fromResponse(
      problem(400, {
        status: 400,
        errorCode: 'VALIDATION_FAILED',
        detail: 'The request has invalid fields',
        errors: [{ field: 'startDate', message: 'must not be null' }],
      }),
    );
    expect(error.status).toBe(400);
    expect(error.errorCode).toBe('VALIDATION_FAILED');
    expect(error.detail).toBe('The request has invalid fields');
    expect(error.fieldErrorMap()).toEqual({ startDate: 'must not be null' });
  });

  it('reads every broken leave rule', async () => {
    const error = await ApiError.fromResponse(
      problem(422, {
        errorCode: 'INSUFFICIENT_NOTICE',
        detail: 'The request breaks 2 leave rules',
        violations: [
          { code: 'INSUFFICIENT_NOTICE', message: 'Apply 3 days ahead' },
          { code: 'ATTACHMENT_REQUIRED', message: 'Attach a certificate' },
        ],
      }),
    );
    expect(error.violations.map((violation) => violation.code)).toEqual([
      'INSUFFICIENT_NOTICE',
      'ATTACHMENT_REQUIRED',
    ]);
  });

  it('describes responses that are not problem details', async () => {
    const error = await ApiError.fromResponse(
      new Response('<html>Bad gateway</html>', {
        status: 502,
        statusText: 'Bad Gateway',
        headers: { 'Content-Type': 'text/html' },
      }),
    );
    expect(error.errorCode).toBe('UNEXPECTED_RESPONSE');
    expect(error.detail).toBe('The server answered 502 Bad Gateway');
  });
});

describe('errorMessage', () => {
  it('shows the problem detail, and a generic message for anything else', () => {
    expect(
      errorMessage(new ApiError({ status: 409, errorCode: 'OVERLAPPING_LEAVE', detail: 'Overlaps' })),
    ).toBe('Overlaps');
    expect(errorMessage(new TypeError('x is undefined'))).toBe('Something went wrong. Please try again.');
  });
});
