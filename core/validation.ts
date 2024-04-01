import { action, makeAutoObservable, observable } from "mobx";

type PendingValidation = {
  readonly state: "pending";
  readonly value: never;
};

type ValidValidation<T> = {
  readonly state: "valid";

  /**
   * The valid value.
   */
  readonly value: T;
};

type InvalidValidation = {
  readonly state: "invalid";
  readonly value: never;
};

type ValidationState<Value> = {
  /**
   * An observable list of errors for this validation.
   */
  readonly errors: readonly ValidationError[];
} & (PendingValidation | ValidValidation<Value> | InvalidValidation);

export type Validation<Value, InvalidValue = Value> = ValidationState<Value> & {
  /**
   * Whether this validation produced any errors.
   * Shorthand for `errors.length > 0`.
   */
  readonly hasError: boolean;

  /**
   * Runs the validation on the passed value.
   * @param value the value being validated.
   */
  validate(value: InvalidValue): Promise<unknown>;
};

/**
 * A function which receives a value, and must throw to signal that the value is invalid.
 * If the function is asynchronous, then the promise must reject.
 */
export type Validator<T> = (value: T) => any;

export class ValidationError extends Error {
  /**
   * Whether the validation should stop after hitting this error.
   */
  readonly bail: boolean;

  constructor(message: string, opts?: { bail: boolean; cause?: unknown }) {
    super(message, { cause: opts?.cause });
    this.bail = opts?.bail ?? true;
  }

  /**
   * Maps any value to a `ValidationError`.
   *
   * - If `e` is an instance of `ValidationError`, it's returned as is;
   * - If `e` is an instance of `Error`, its message is used as the new `ValidationError`'s
   *   message, and it's set as the cause.
   * - Otherwise, `e` is converted to a string and set as the error's message and cause.
   */
  static from(e: unknown): ValidationError {
    if (e instanceof ValidationError) {
      return e;
    }

    if (e instanceof Error) {
      return new ValidationError(e.message, { bail: true, cause: e });
    }

    return new ValidationError(String(e), { bail: true, cause: e });
  }
}

/**
 * Create a validation state based off of a list of validators.
 */
export function createValidation<Value, InvalidValue = Value>(
  ...validators: (Validator<InvalidValue> | Validator<InvalidValue>[])[]
): Validation<Value, InvalidValue> {
  const allValidators = validators.flat();
  const validation = makeAutoObservable<Validation<Value, InvalidValue>>(
    {
      state: "pending",
      value: undefined as never,
      errors: [],
      get hasError() {
        return this.errors.length > 0;
      },
      async validate(value: InvalidValue) {
        update({ state: "pending", errors: [], value: undefined as never });

        const errors = [];
        for (const validator of allValidators) {
          try {
            await validator(value);
          } catch (e: unknown) {
            const error = ValidationError.from(e);
            errors.push(error);
            if (error.bail) {
              break;
            }
          }
        }

        if (errors.length) {
          update({ state: "invalid", errors, value: undefined as never });
        } else {
          update({ state: "valid", errors, value: value as unknown as Value });
        }
      },
    },
    {
      errors: observable.shallow,
    },
  );

  const update = action("fielded::validation#update", (update: ValidationState<Value>) =>
    Object.assign(validation, update),
  );

  return validation;
}