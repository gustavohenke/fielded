import { action, computed, makeObservable, observable } from "mobx";
import { Validation, ValidationError, Validator, createValidation } from "./validation";

/**
 * A union of all supported types for field values.
 */
type FieldValue = string | number;

/**
 * The field type as a literal string.
 */
type FieldType<Value extends FieldValue> = Value extends number ? "number" : "text";

/**
 * Bag of options that a field of the specified `Value` type can have.
 */
type FieldOptions<Value extends FieldValue> = {
  initialValue?: Value | null;
};

/**
 * A validator function which receives the value of a field, and must return an error message,
 * or undefined, if the field is valid.
 */
type FieldValidator<Value extends FieldValue> = (value: Value | undefined) => string | undefined;

export abstract class Field<Value extends FieldValue> {
  private readonly options?: FieldOptions<Value>;
  private readonly validators: Validator<Value>[] = [];

  /**
   * The type of the field.
   */
  readonly type: FieldType<Value>;

  /**
   * Observable current value of the field.
   */
  @observable.ref
  value: Value | undefined;

  @observable.ref
  validation?: Validation<Value, Value | undefined>;

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

  protected constructor(type: FieldType<Value>, options?: FieldOptions<Value>) {
    makeObservable(this);
    this.type = type;
    this.options = options;
    this.value = this.options?.initialValue ?? undefined;
  }

  /**
   * Creates a field instance which has a number type.
   */
  static number(initialValue?: number | null): Field<number> {
    return new NumberField({ initialValue });
  }

  /**
   * Creates a field instance which has a text type.
   */
  static text(initialValue?: string | null): Field<string> {
    return new TextField({ initialValue });
  }

  /**
   * Updates the underlying value of the field.
   * @returns self, for chaining
   */
  @action
  set(value: Value | undefined): this {
    this.value = value;
    this.validation = createValidation(this.validators);
    this.validation.validate(value);
    return this;
  }

  /**
   * Add one or more validators to this field.
   * @returns self, for chaining
   */
  addValidators(...validators: Validator<Value>[]): this {
    this.validators.push(...validators);
    return this;
  }

  /**
   * Builds and returns an observable bag of handy React props for rendering an input or textarea
   * element that represent this field.
   */
  getReactProps(): {
    type: string;
    value: NonNullable<Value> | "";
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

class NumberField extends Field<number> {
  constructor(options?: FieldOptions<number>) {
    super("number", options);
  }

  protected onDOMChange(evt: ChangeEvent): void {
    const value = Number(evt.target.value);
    this.set(isNaN(value) ? undefined : value);
  }
}

class TextField extends Field<string> {
  constructor(options?: FieldOptions<string>) {
    super("text", options);
  }

  protected onDOMChange(evt: ChangeEvent): void {
    this.set(evt.target.value);
  }
}

type ChangeEvent = {
  target: HTMLInputElement | HTMLTextAreaElement;
};
