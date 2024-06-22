import { action, makeObservable, observable } from "mobx";
import { Validation, ValidationError, Validator, createValidation } from "./validation";

type FieldValue<T> = (T extends number ? number : string) | undefined;

/**
 * Utility type to check whether `A` is `never`, and if it's, fallback to `B` instead.
 *
 * @see https://stackoverflow.com/a/58978075/2083599
 */
type Either<A, B> = [A] extends [never] ? B : A;

/**
 * The field type as a literal string.
 */
type FieldType = "number" | "text";

/**
 * Configurations that a field of the specified `T` type can have.
 */
type FieldConfig<T> = {
  validators: Validator<FieldValue<T>, T extends FieldValue<T> ? T : never>[];
  initialValue?: FieldValue<T> | null;
};

export abstract class Field<T> {
  protected readonly config: FieldConfig<T>;

  /**
   * The type of the field.
   */
  readonly type: FieldType;

  /**
   * Observable current value of the field.
   */
  @observable.ref
  value: FieldValue<T>;

  @observable.ref
  validation?: Validation<FieldValue<T>, T>;

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

  protected constructor(type: FieldType, config: FieldConfig<T>) {
    makeObservable(this);
    this.type = type;
    this.config = config;
    this.value = this.config?.initialValue ?? undefined;
  }

  /**
   * Creates a field instance which has a number type. It's optional by default.
   */
  static number(initialValue?: number | null): Field<number | undefined> {
    return new NumberFieldImpl({ initialValue, validators: [] });
  }

  /**
   * Creates a field instance which has a text type. It's optional by default.
   */
  static text(initialValue?: string | null): Field<string | undefined> {
    return new TextFieldImpl({ initialValue, validators: [] });
  }

  /**
   * Updates the underlying value of the field.
   * @returns self, for chaining
   */
  @action
  set(value: FieldValue<T>): this {
    this.value = value;
    this.validate();
    return this;
  }

  @action
  async validate(): Promise<Validation<FieldValue<T>, T>> {
    this.validation = createValidation(this.config.validators);
    await this.validation.validate(this.value);
    return this.validation;
  }

  /**
   * Add one or more validators to this field.
   * @returns a new field with the new validator(s) appended to the previous list of validators.
   */
  abstract addValidators<U extends T = T>(...validators: Validator<T, U>[]): Field<Either<U, T>>;
}

class NumberFieldImpl<T extends number | undefined> extends Field<T> {
  constructor(config: FieldConfig<T>) {
    super("number", config);
  }

  /** @inheritdoc */
  addValidators<U extends T = T>(...validators: Validator<T, U>[]): Field<Either<U, T>> {
    return new NumberFieldImpl<Either<U, T>>({
      ...this.config,
      validators: this.config.validators.concat(validators as Validator<any>[]),
    });
  }
}

class TextFieldImpl<T extends string | undefined> extends Field<T> {
  constructor(config: FieldConfig<T>) {
    super("text", config);
  }

  /** @inheritdoc */
  addValidators<U extends T = T>(...validators: Validator<T, U>[]): Field<Either<U, T>> {
    return new TextFieldImpl<Either<U, T>>({
      ...this.config,
      validators: this.config.validators.concat(validators as Validator<any>[]),
    });
  }
}
