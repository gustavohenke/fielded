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
   * Shortcut for `errors.length > 0`.
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
  constructor(
    message: string,
    /**
     * Whether the validation should stop after hitting this error.
     */
    readonly bail = false,
    cause?: unknown,
  ) {
    super(message, { cause });
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
            const error = toValidationError(e);
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

/**
 * Maps any value to a {@link ValidationError}.
 */
function toValidationError(e: unknown): ValidationError {
  if (e instanceof ValidationError) {
    return e;
  }

  if (e instanceof Error) {
    return new ValidationError(e.message, false, e);
  }

  return new ValidationError(String(e), false, e);
}
