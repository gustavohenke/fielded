import { action, makeObservable, observable } from "mobx";

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

export class Field<Value extends FieldValue> {
  private readonly options?: FieldOptions<Value>;

  /**
   * The type of the field.
   */
  readonly type: FieldType<Value>;

  /**
   * Observable current value of the field.
   */
  @observable.ref
  value: Value | undefined;

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
   */
  @action
  set(value: Value | undefined): void {
    this.value = value;
  }

  /**
   * @returns An object of React props that represent the current state of the field
   */
  getReactProps() {
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

function makeChangeCallback(
  field: Field<any>,
): (evt: { target: HTMLInputElement | HTMLTextAreaElement }) => void {
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
