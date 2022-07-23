import { action, computed, makeObservable, observable } from "mobx";

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

export class Field<Value extends FieldValue> {
  private readonly options?: FieldOptions<Value>;
  private readonly validators: FieldValidator<Value>[] = [];

  /**
   * The type of the field.
   */
  readonly type: FieldType<Value>;

  /**
   * Observable current value of the field.
   */
  @observable.ref
  value: Value | undefined;

  /**
   * Observable error of the field, if any.
   */
  @computed
  get error(): string | undefined {
    for (const validator of this.validators) {
      const error = validator(this.value);
      if (error) {
        return error;
      }
    }
  }

  /**
   * Whether the field is valid.
   */
  @computed
  get valid(): boolean {
    return this.error == null;
  }

  private constructor(type: FieldType<Value>, options?: FieldOptions<Value>) {
    makeObservable(this);
    this.type = type;
    this.options = options;
    this.value = this.options?.initialValue ?? undefined;
  }

  /**
   * Creates a field instance which has a number type.
   */
  static number(initialValue?: number | null) {
    return new Field("number", { initialValue });
  }

  /**
   * Creates a field instance which has a text type.
   */
  static text(initialValue?: string | null) {
    return new Field("text", { initialValue });
  }

  /**
   * Updates the underlying value of the field.
   * @returns self, for chaining
   */
  @action
  set(value: Value | undefined): this {
    this.value = value;
    return this;
  }

  /**
   * Add one or more validators to this field.
   * @returns self, for chaining
   */
  addValidators(...validators: FieldValidator<Value>[]): this {
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
      onChange: makeChangeCallback(this),
    };
  }
}

/**
 * Guard for verifying that a number is actually a number field.
 */
function isNumberField(field: Field<any>): field is Field<number> {
  return field.type === "number";
}

/**
 * Guard for verifying that a number is actually a text field.
 */
function isTextField(field: Field<any>): field is Field<string> {
  return field.type === "text";
}

type ChangeEvent = {
  target: HTMLInputElement | HTMLTextAreaElement;
};
function makeChangeCallback<T extends Field<any>>(field: T): (evt: ChangeEvent) => void {
  return (evt) => {
    if (isNumberField(field)) {
      const value = Number(evt.target.value);
      return field.set(isNaN(value) ? undefined : value);
    }
    if (isTextField(field)) {
      return field.set(evt.target.value);
    }
  };
}
