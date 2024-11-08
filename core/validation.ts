import { action, makeAutoObservable, makeObservable, observable } from "mobx";

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

type BaseValidation = {
  /**
   * A promise that signals when the validation has completed,
   * e.g. its state has changed from pending to another value
   */
  readonly finished: Promise<void>;

  /**
   * An observable list of errors for this validation.
   */
  readonly errors: readonly ValidationError[];
};

export type Validation<InvalidValue, Value = InvalidValue> = BaseValidation &
  (PendingValidation | ValidValidation<Value> | InvalidValidation);

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
 * Utility to remove the readonly flags from a type `T`
 */
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

export function validate<InvalidValue, Value extends InvalidValue = InvalidValue>(
  value: InvalidValue,
  validators: (Validator<InvalidValue, Value> | Validator<InvalidValue, Value>[])[],
): Validation<InvalidValue, Value> {
  const allValidators = validators.flat();
  const validation: Mutable<Validation<InvalidValue, Value>> = makeObservable(
    {
      state: "pending",
      value: undefined as never,
      errors: [],
      finished: Promise.resolve(),
    },
    {
      state: observable.ref,
      value: observable.ref,
      errors: observable.shallow,
    },
  );
  const update = action(
    "fielded::validation#update",
    (update: Omit<Validation<Value>, "finished">) => Object.assign(validation, update),
  );
  validation.finished = run();
  return validation;

  async function run() {
    let result: unknown;
    const errors = [];
    for (const validator of allValidators) {
      try {
        result = typeof validator === "function" ? validator(value) : validator.validate(value);

        // Only await if the result looks like a promise. Makes validation chains such as
        // `val => { if (val == something) { throw ... } }` less awkward to debug,
        // as throwing is synchronous, but returning isn't.
        if (result && typeof result === "object" && "then" in result) {
          await result;
        }
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
  }
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
  const finished = Promise.resolve();
  switch (state) {
    case "valid":
      return { state, value: arg, errors: [], finished };

    case "invalid":
      const errors = arg || [];
      return {
        state,
        value: undefined as never,
        errors: errors.map((error: any) => ValidationError.from(error)),
        finished,
      };

    case "pending":
      return { state, value: undefined as never, errors: [], finished };
  }
}
