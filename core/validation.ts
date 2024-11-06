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

export type Validation<InvalidValue, Value = InvalidValue> = ValidationState<Value> & {
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
export type Validator<InvalidValue, Value extends InvalidValue = InvalidValue> =
  // NOTE: Order is important. If the `asserts` type goes after the return types, TS might infer `Value` = `InvalidValue`
  | ((value: InvalidValue) => asserts value is Value)
  | ((value: InvalidValue) => Promise<Value> | Value)
  | { validate(value: InvalidValue): asserts value is Value }
  | { validate(value: InvalidValue): Promise<Value> | Value };

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
 * Special token that validators in aggregated objects (such as form or form arrays) can return to
 * stop validation and mark it as invalid without actually having any errors.
 *
 * For example, a form might want to run the validations of all its component fields and mark itself
 * invalid if the components have errors.
 */
export const AGGREGATE_ERROR = {};

/**
 * Create a validation state based off of a list of validators.
 */
export function createValidation<InvalidValue, Value extends InvalidValue = InvalidValue>(
  ...validators: (Validator<InvalidValue, Value> | Validator<InvalidValue, Value>[])[]
): Validation<InvalidValue, Value> {
  const allValidators = validators.flat();
  const validation = makeAutoObservable<Validation<InvalidValue, Value>>(
    {
      state: "pending",
      value: undefined as never,
      errors: [],
      get hasError() {
        return this.errors.length > 0;
      },
      async validate(value: InvalidValue) {
        update({ state: "pending", errors: [], value: undefined as never });

        let result: unknown;
        const errors = [];
        for (const validator of allValidators) {
          try {
            await (typeof validator === "function" ? validator(value) : validator.validate(value));
          } catch (e: unknown) {
            if (e === AGGREGATE_ERROR) {
              result = e;
              break;
            }

            const error = ValidationError.from(e);
            errors.push(error);
            if (error.bail) {
              break;
            }
          }
        }

        if (result === AGGREGATE_ERROR || errors.length) {
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
 * Create a validation state in the invalid state, using the given errors.
 * Useful for testing.
 */
export function createStubValidation(
  state: "invalid",
  errors?: readonly unknown[],
): Validation<any>;

/**
 * Create a validation state in the valid state, using the given value.
 * Useful for testing.
 */
export function createStubValidation<T = any>(state: "valid", value?: T): Validation<T>;

/**
 * Creates a validation state in the pending state.
 * Useful for testing.
 */
export function createStubValidation(state: "pending"): Validation<any>;

export function createStubValidation<T = any>(
  state: Validation<T>["state"],
  arg?: any,
): Validation<T> {
  const validate = async () => {};
  switch (state) {
    case "valid":
      return { state, value: arg, errors: [], hasError: false, validate };

    case "invalid":
      const errors = arg || [];
      return {
        state,
        value: undefined as never,
        errors: errors.map((error: any) => ValidationError.from(error)),
        hasError: errors.length > 0,
        validate,
      };

    case "pending":
      return { state, value: undefined as never, errors: [], hasError: false, validate };
  }
}
