import { action, makeObservable, observable } from "mobx";
import { Validation, ValidationError, Validator, createValidation } from "./validation";

type FieldValue<T> = (T extends number ? number : string) | undefined;

/**
 * The field type as a literal string.
 */
type FieldType = "number" | "text";

/**
 * Bag of options that a field of the specified `T` type can have.
 */
type FieldOptions<T> = {
  validators: Validator<FieldValue<T>, T extends FieldValue<T> ? T : never>[];
  initialValue?: FieldValue<T> | null;
};

export abstract class Field<T> {
  protected readonly options: FieldOptions<T>;

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

  protected constructor(type: FieldType, options: FieldOptions<T>) {
    makeObservable(this);
    this.type = type;
    this.options = options;
    this.value = this.options?.initialValue ?? undefined;
  }

  /**
   * Creates a field instance which has a number type.
   */
  static number(initialValue?: number | null): Field<number> {
    return new NumberField({ initialValue, validators: [] });
  }

  /**
   * Creates a field instance which has a text type.
   */
  static text(initialValue?: string | null): Field<string> {
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
    this.validation = createValidation(this.options.validators);
    await this.validation.validate(this.value);
    return this.validation;
  }

  /**
   * Add one or more validators to this field.
   * @returns a new field with the new validator(s) appended to the previous list of validators.
   */
  abstract addValidators<U extends T = T>(...validators: Validator<T, U>[]): Field<U>;

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

class NumberField<T extends number> extends Field<T> {
  constructor(options: FieldOptions<T>) {
    super("number", options);
  }

  protected onDOMChange(evt: ChangeEvent): void {
    const value = Number(evt.target.value);
    this.set(isNaN(value) ? undefined : (value as FieldValue<T>));
  }

  /** @inheritdoc */
  addValidators<U extends T = T>(...validators: Validator<T, U>[]): Field<U> {
    return new NumberField<U>({
      ...this.options,
      validators: this.options.validators.concat(validators as Validator<any>[]),
    });
  }
}

class TextField<T extends string> extends Field<T> {
  constructor(options: FieldOptions<T>) {
    super("text", options);
  }

  protected onDOMChange(evt: ChangeEvent): void {
    this.set(evt.target.value as FieldValue<T>);
  }

  /** @inheritdoc */
  addValidators<U extends T = T>(...validators: Validator<T, U>[]): Field<U> {
    return new TextField<U>({
      ...this.options,
      validators: this.options.validators.concat(validators as Validator<any>[]),
    });
  }
}

type ChangeEvent = {
  target: HTMLInputElement | HTMLTextAreaElement;
};
