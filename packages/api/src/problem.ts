import type { components } from './generated/tenant';

type ProblemDetail = components['schemas']['ProblemDetail'];

/** Every code the backend returns, plus the two the client raises itself. */
export type ErrorCode = NonNullable<ProblemDetail['errorCode']> | 'NETWORK_ERROR' | 'UNEXPECTED_RESPONSE';

export interface FieldError {
  /** Empty when the problem is about a row of an imported file rather than a field. */
  field: string;
  /** For imports: the file's row (1 is the header). */
  row?: number;
  message: string;
}

export interface RuleViolation {
  code: string;
  message: string;
}

/**
 * A failed API call. Built from the backend's `application/problem+json` body: `detail` is safe to show
 * to the user, `fieldErrors` come with VALIDATION_FAILED and `violations` with broken leave rules.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: ErrorCode;
  readonly detail: string;
  readonly fieldErrors: FieldError[];
  readonly violations: RuleViolation[];

  constructor(init: {
    status: number;
    errorCode: ErrorCode;
    detail: string;
    fieldErrors?: FieldError[];
    violations?: RuleViolation[];
    cause?: unknown;
  }) {
    super(init.detail, { cause: init.cause });
    this.name = 'ApiError';
    this.status = init.status;
    this.errorCode = init.errorCode;
    this.detail = init.detail;
    this.fieldErrors = init.fieldErrors ?? [];
    this.violations = init.violations ?? [];
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const problem = await readProblem(response);
    if (!problem?.errorCode) {
      return new ApiError({
        status: response.status,
        errorCode: 'UNEXPECTED_RESPONSE',
        detail: `The server answered ${response.status} ${response.statusText}`.trim(),
      });
    }
    return new ApiError({
      status: response.status,
      errorCode: problem.errorCode,
      detail: problem.detail ?? problem.title ?? problem.errorCode,
      fieldErrors: (problem.errors ?? []).map((error) => ({
        field: error.field ?? '',
        row: error.row,
        message: error.message ?? '',
      })),
      violations: (problem.violations ?? []).map((violation) => ({
        code: violation.code ?? '',
        message: violation.message ?? '',
      })),
    });
  }

  static network(cause: unknown): ApiError {
    return new ApiError({
      status: 0,
      errorCode: 'NETWORK_ERROR',
      detail: 'The server could not be reached. Check your connection and try again.',
      cause,
    });
  }

  /** Field errors keyed by field name, in the shape Mantine forms take (`form.setErrors`). */
  fieldErrorMap(): Record<string, string> {
    return Object.fromEntries(
      this.fieldErrors.filter((error) => error.field).map((error) => [error.field, error.message]),
    );
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** What to tell the user about any error. */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.detail;
  }
  return 'Something went wrong. Please try again.';
}

async function readProblem(response: Response): Promise<ProblemDetail | null> {
  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('json')) {
    return null;
  }
  try {
    return (await response.json()) as ProblemDetail;
  } catch {
    return null;
  }
}
