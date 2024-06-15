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
    return new NumberField({ initialValue, validators: [] });
  }

  /**
   * Creates a field instance which has a text type. It's optional by default.
   */
  static text(initialValue?: string | null): Field<string | undefined> {
    return new TextField({ initialValue, validators: [] });
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

  /**
   * Builds and returns an observable bag of handy React props for rendering an input or textarea
   * element that represent this field.
   */
  getReactProps(): {
    type: string;
    value: NonNullable<FieldValue<T>> | "";
    onChange: (evt: ChangeEvent) => void;
  } {
    const { value, type } = this;
    return {
      type,
      // Default to empty string to avoid React complaining that an input
      // has changed from uncontrolled to controlled.
      value: value ?? "",
      onChange: (evt) => this.onDOMChange(evt),
    };
  }

  /**
   * Callback for when a DOM ChangeEvent happens.
   */
  protected abstract onDOMChange(evt: ChangeEvent): void;
}

class NumberField<T extends number | undefined> extends Field<T> {
  constructor(config: FieldConfig<T>) {
    super("number", config);
  }

  protected onDOMChange(evt: ChangeEvent): void {
    const value = Number(evt.target.value);
    this.set(isNaN(value) ? undefined : (value as FieldValue<T>));
  }

  /** @inheritdoc */
  addValidators<U extends T = T>(...validators: Validator<T, U>[]): Field<Either<U, T>> {
    return new NumberField<Either<U, T>>({
      ...this.config,
      validators: this.config.validators.concat(validators as Validator<any>[]),
    });
  }
}

class TextField<T extends string | undefined> extends Field<T> {
  constructor(config: FieldConfig<T>) {
    super("text", config);
  }

  protected onDOMChange(evt: ChangeEvent): void {
    this.set(evt.target.value as FieldValue<T>);
  }

  /** @inheritdoc */
  addValidators<U extends T = T>(...validators: Validator<T, U>[]): Field<Either<U, T>> {
    return new TextField<Either<U, T>>({
      ...this.config,
      validators: this.config.validators.concat(validators as Validator<any>[]),
    });
  }
}

type ChangeEvent = {
  target: HTMLInputElement | HTMLTextAreaElement;
};
