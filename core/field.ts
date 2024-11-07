import { action, computed, makeObservable, observable } from "mobx";
import {
  Validation,
  ValidationError,
  Validator,
  createStubValidation,
  createValidation,
} from "./validation";

/**
 * The value of a field is
 * 1. For literals and primitives: its primitive type, so `FieldValue<'foo'>` maps to `string`;
 * 2. For collections, such as arrays, sets or maps: a collection of `FieldValue` of the
 *    collection's generic type, so `FieldValue<(1 | 2)[]>` maps to `number[]`;
 * 3. For other object types: the same type, so `FieldValue<Date>` is `Date`;
 * 4. For `unknown`: `any`;
 * 5. For anything else: `never`.
 */
// When changing this type, please keep the structure similar.
// It's been tailored to expand to a simple value e.g. in intellisense of VS Code.
type FieldValue<T> = T extends string
  ? string
  : T extends number
  ? number
  : T extends bigint
  ? bigint
  : T extends boolean
  ? boolean
  : T extends undefined
  ? undefined
  : T extends (infer U)[]
  ? FieldValue<U>[]
  : T extends Set<infer U>
  ? Set<FieldValue<U>>
  : T extends Map<infer K, infer U>
  ? Map<K, FieldValue<U>>
  : T extends object
  ? T
  : T extends unknown
  ? any
  : never;

/**
 * Utility type to check whether `A` is `never`, and if it's, fallback to `B` instead.
 *
 * @see https://stackoverflow.com/a/58978075/2083599
 */
type Either<A, B> = [A] extends [never] ? B : A;

/**
 * Configurations that a field of the specified `T` type can have.
 */
type FieldConfig<T> = {
  validators: Validator<FieldValue<T> | undefined, T extends FieldValue<T> ? T : never>[];
  initialValue?: FieldValue<T>;
};

export class Field<T = unknown> {
  /**
   * Observable current value of the field, which might be invalid.
   */
  @observable.ref
  rawValue: FieldValue<T> | undefined;

  /**
   * Observable current value of the field if valid, or undefined if invalid.
   */
  @computed
  get value(): T | undefined {
    if (this.validation?.state === "valid") {
      return this.validation.value;
    }
  }

  @observable.ref
  validation?: Validation<FieldValue<T> | undefined, T>;

  /**
   * The first validation error of the field, if any.
   */
  get error(): ValidationError | undefined {
    return this.errors.at(0);
  }

  /**
   * Observable list of validation errors of the field.
   */
  get errors(): readonly ValidationError[] {
    return this.validation?.errors || [];
  }

  private constructor(private readonly config: FieldConfig<T>) {
    makeObservable(this);
    this.rawValue = this.config.initialValue;
  }

  /**
   * Creates a field instance which has a number type. It's optional by default.
   */
  static number(initialValue?: number): Field<number | undefined> {
    return new Field<number | undefined>({ initialValue, validators: [] });
  }

  /**
   * Creates a field instance which has a text type. It's optional by default.
   */
  static text(initialValue?: string): Field<string | undefined> {
    return new Field<string | undefined>({ initialValue, validators: [] });
  }

  /**
   * Creates a field instance whose type come from a validator.
   */
  static fromValidator<T>(
    validator: Validator<FieldValue<unknown>, T>,
    initialValue?: FieldValue<T>,
  ): Field<T> {
    return new Field({ validators: [validator], initialValue });
  }

  /**
   * Updates the underlying value of the field.
   * @returns self, for chaining
   */
  @action
  set(value: FieldValue<T>): this {
    this.rawValue = value;
    this.validate();
    return this;
  }

  /**
   * Resets this field to its original value and removes its validation state.
   */
  @action
  reset(): void {
    this.validation = undefined;
    this.rawValue = this.config.initialValue;
  }

  @action
  async validate(): Promise<Validation<FieldValue<T> | undefined, T>> {
    this.validation = createValidation(this.config.validators);
    await this.validation.validate(this.rawValue);
    return this.validation;
  }

  /**
   * Add one or more validators to this field.
   * @returns a new field with the new validator(s) appended to the previous list of validators.
   */
  addValidators<U extends T = T>(...validators: Validator<T, U>[]): Field<Either<U, T>> {
    return new Field({
      ...(this.config as NoInfer<any>),
      validators: this.config.validators.concat(validators as Validator<any>[]),
    });
  }

  /**
   * Sets the field to an invalid state with the specified error.
   */
  @action
  setError(error: unknown): this {
    this.validation = createStubValidation("invalid", [error]);
    return this;
  }
}
