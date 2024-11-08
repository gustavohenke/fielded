import { action, computed, makeObservable, observable } from "mobx";
import { Field } from "./field";
import { AGGREGATE_ERROR, Validation, ValidationError, Validator, validate } from "./validation";

/**
 * A map from field name to its state, in the form of either `Field`, `Form` or `FormArray`.
 */
export type FormDataMap = Record<string, Field<any> | Form<any> | FormArray<any>>;

export type FormData = FormDataMap | Form<any> | Form<any>[];

/**
 * The snapshot type of a valid field.
 */
export type FieldSnapshot<T extends Field<any>> = T extends Field<infer U> ? U : never;

/**
 * The snapshot type of an invalid field.
 */
export type InvalidFieldSnapshot<T extends Field<any>> = T["rawValue"];

/**
 * The snapshot type of a valid form.
 */
export type FormSnapshot<T extends FormData> = T extends Form<infer FormType>
  ? FormSnapshot<FormType>
  : {
      [K in keyof T]: T[K] extends Field<any>
        ? FieldSnapshot<T[K]>
        : T[K] extends Form<infer FormType>
        ? FormSnapshot<FormType>
        : T[K] extends FormArray<Form<infer FormType>>
        ? FormSnapshot<FormType>[]
        : never;
    };

/**
 * The snapshot type of an invalid form.
 */
export type InvalidFormSnapshot<T extends FormData> = T extends Form<infer FormType>
  ? InvalidFormSnapshot<FormType>
  : {
      [K in keyof T]: T[K] extends Field<any>
        ? InvalidFieldSnapshot<T[K]>
        : T[K] extends Form<infer FormType>
        ? InvalidFormSnapshot<FormType>
        : T[K] extends FormArray<Form<infer FormType>>
        ? InvalidFormSnapshot<FormType>[]
        : never;
    };

export class Form<T extends FormDataMap> {
  /**
   * @see `addValidators` for generic type explanation
   */
  private readonly validators: Validator<FormSnapshot<T>, FormSnapshot<T>>[] = [];

  /**
   * An object of fields that compose this form.
   */
  readonly fields: T;

  @observable.ref
  validation?: Validation<InvalidFormSnapshot<T>, FormSnapshot<T>>;

  /**
   * Observable, first validation error from the form's nested fields, or if there aren't any,
   * its own validation errors.
   *
   * This works like this because the form validators expect all fields to be valid before running.
   * @see addValidators
   */
  get error(): ValidationError | undefined {
    return this.errors.at(0);
  }

  /**
   * Observable list of validation errors either from the form's nested fields,
   * or if there aren't any, the form's own validation errors.
   *
   * This works like this because the form validators expect all fields to be valid before running.
   * @see addValidators
   */
  @computed
  get errors(): readonly ValidationError[] {
    if (this.fieldErrors.length) {
      return this.fieldErrors;
    }
    return this.formErrors;
  }

  /**
   * Observable, first validation error from the form itself.
   */
  get formError(): ValidationError | undefined {
    return this.formErrors.at(0);
  }

  /**
   * Observable list of validation errors from the form itself.
   */
  get formErrors(): readonly ValidationError[] {
    return this.validation?.errors || [];
  }

  /**
   * Observable, first validation error from any of the form's nested fields.
   */
  get fieldError(): ValidationError | undefined {
    return this.fieldErrors.at(0);
  }

  /**
   * Observable list of validation errors from its nested fields,
   * followed by the form's own validation errors.
   */
  @computed
  get fieldErrors(): readonly ValidationError[] {
    return Object.values(this.fields).flatMap((field) => field.errors);
  }

  constructor(fields: T) {
    this.fields = fields;
  }

  /**
   * Recursively snapshots the current state of the form and returns it.
   */
  snapshot(): InvalidFormSnapshot<T> {
    const snapshot: any = {};
    for (const [key, value] of Object.entries(this.fields)) {
      if (value instanceof Field) {
        snapshot[key] = value.rawValue;
      } else {
        snapshot[key] = value.snapshot();
      }
    }
    return snapshot;
  }

  /**
   * Resets this form by recursively calling `.reset()` on each nested field, and removing
   * validation state.
   */
  @action
  reset(): void {
    this.validation = undefined;
    for (const value of Object.values(this.fields)) {
      value.reset();
    }
  }

  @action
  async validate(): Promise<Validation<InvalidFormSnapshot<T>, FormSnapshot<T>>> {
    this.validation = validate(this.snapshot(), [() => this.validateAll(), this.validators]);
    await this.validation.finished;
    return this.validation;
  }

  /**
   * Add one or more validators to this form.
   *
   * Note that the validator's "invalid value" is a `FormSnapshot`, which is the type of a
   * validated form. That's because the underlying data is validated at the field level before
   * additional `Form` validators run.
   *
   * @returns self, for chaining
   */
  // TODO: In the future, it might be nice to allow refining the type, so that e.g. an array is
  // cast to a tuple via a validator.
  addValidators(...validators: Validator<FormSnapshot<T>, FormSnapshot<T>>[]): this {
    this.validators.push(...validators);
    return this;
  }

  private async validateAll() {
    const validations = await Promise.all(
      Object.values(this.fields).map((field) => field.validate()),
    );

    const invalid = validations.some((validation) => validation?.state === "invalid");
    if (invalid) {
      throw AGGREGATE_ERROR;
    }
  }
}

export class FormArray<T extends Form<any>> {
  private readonly validators: Validator<FormSnapshot<T>[], FormSnapshot<T>[]>[] = [];

  private readonly initialValue: readonly T[];

  /**
   * An observable list of forms that compose this form.
   */
  @observable.shallow
  readonly rows: T[];

  @observable.ref
  validation?: Validation<InvalidFormSnapshot<T>[], FormSnapshot<T>[]>;

  /**
   * Observable, first validation error of the form array.
   */
  get error(): ValidationError | undefined {
    return this.errors.at(0);
  }

  /**
   * Observable list of validation errors of the form array.
   */
  get errors(): readonly ValidationError[] {
    return this.validation?.errors || [];
  }

  constructor(rows: T[] = []) {
    makeObservable(this);
    this.initialValue = rows;
    this.rows = rows.slice();
  }

  /**
   * Adds one or more rows.
   * @returns self for chaining
   */
  @action
  add(...rows: T[]): this {
    this.rows.push(...rows);
    return this;
  }

  /**
   * Removes a row by its index.
   * @returns self for chaining
   */
  remove(index: number): this;

  /**
   * Removes a row by its value.
   * @returns self for chaining
   */
  remove(row: T): this;

  @action
  remove(row: T | number): this {
    let index = typeof row === "number" ? row : this.rows.indexOf(row);
    this.rows.splice(index, 1);
    return this;
  }

  /**
   * Recursively snapshots the current state of the form and returns it.
   */
  snapshot(): InvalidFormSnapshot<T>[] {
    return this.rows.map((f) => f.snapshot() as InvalidFormSnapshot<T>);
  }

  /**
   * Resets this form array by removing excess rows, adding missing rows, recursively resetting
   * each of them, and removing the validation state.
   */
  @action
  reset(): void {
    this.validation = undefined;

    this.rows.splice(this.initialValue.length);
    for (let i = 0; i < this.initialValue.length; i++) {
      this.rows[i] = this.initialValue[i];
      this.rows[i].reset();
    }
  }

  @action
  async validate(): Promise<Validation<InvalidFormSnapshot<T>[], FormSnapshot<T>[]>> {
    this.validation = validate(this.snapshot(), [() => this.validateAll(), this.validators]);
    await this.validation.finished;
    return this.validation;
  }

  /**
   * Add one or more validators to this form array.
   *
   * Note that the validator's "invalid value" is a `FormSnapshot`, which is the type of a
   * validated form. That's because the underlying data is validated at the field level before
   * additional `FormArray` validators run.
   *
   * @returns self, for chaining
   */
  // TODO: In the future, it might be nice to allow refining the type, so that e.g. an array is
  // cast to a tuple via a validator.
  addValidators(...validators: Validator<FormSnapshot<T>[], FormSnapshot<T>[]>[]): this {
    this.validators.push(...validators);
    return this;
  }

  private async validateAll() {
    const validations = await Promise.all(this.rows.map((field) => field.validate()));
    const invalid = validations.some((validation) => validation?.state === "invalid");
    if (invalid) {
      throw AGGREGATE_ERROR;
    }
  }
}
