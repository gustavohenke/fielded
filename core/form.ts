import { action, makeObservable, observable } from "mobx";
import { Field } from "./field";
import {
  AGGREGATE_ERROR,
  Validation,
  ValidationError,
  Validator,
  createValidation,
} from "./validation";

/**
 * A map from field name to its state, in the form of either `Field`, `Form` or `FormArray`.
 */
export type FormDataMap = Record<string, Field<any> | Form<any> | FormArray<any>>;

export type FormData = FormDataMap | Form<any>[];

/**
 * The snapshot type of a valid field.
 */
export type FieldSnapshot<T extends Field<any>> = T extends Field<infer U> ? U : never;

/**
 * The snapshot type of an invalid field.
 */
export type InvalidFieldSnapshot<T extends Field<any>> = T["value"];

/**
 * The snapshot type of a valid form.
 */
export type FormSnapshot<T extends FormData> = T extends Form<infer FormType>[]
  ? FormSnapshot<FormType>[]
  : {
      [K in keyof T]: T[K] extends Field<any>
        ? FieldSnapshot<T[K]>
        : T[K] extends Form<infer FormType>
        ? FormSnapshot<FormType>
        : never;
    };

/**
 * The snapshot type of an invalid form.
 */
export type InvalidFormSnapshot<T extends FormData> = T extends Form<infer FormType>[]
  ? InvalidFormSnapshot<FormType>[]
  : {
      [K in keyof T]: T[K] extends Field<any>
        ? InvalidFieldSnapshot<T[K]>
        : T[K] extends Form<infer FormType>
        ? InvalidFormSnapshot<FormType>
        : never;
    };

export class Form<T extends FormDataMap> {
  private readonly validators: Validator<InvalidFormSnapshot<T>, FormSnapshot<T>>[] = [];

  /**
   * An object of fields that compose this form.
   */
  readonly fields: T;

  @observable.ref
  validation?: Validation<InvalidFormSnapshot<T>, FormSnapshot<T>>;

  /**
   * Observable, first validation error of the form.
   */
  get error(): ValidationError | undefined {
    return this.errors.at(0);
  }

  /**
   * Observable list of validation errors of the form.
   */
  get errors(): readonly ValidationError[] {
    return this.validation?.errors || [];
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
        snapshot[key] = value.value;
      } else {
        snapshot[key] = value.snapshot();
      }
    }
    return snapshot;
  }

  @action
  async validate(): Promise<Validation<InvalidFormSnapshot<T>, FormSnapshot<T>>> {
    this.validation = createValidation(() => this.validateAll(), this.validators);
    await this.validation.validate(this.snapshot());
    return this.validation;
  }

  /**
   * Add one or more validators to this form.
   * @returns self, for chaining
   */
  addValidators(...validators: Validator<InvalidFormSnapshot<T>, FormSnapshot<T>>[]): this {
    this.validators.push(...validators);
    return this;
  }

  private async validateAll() {
    const validations = await Promise.all(
      Object.values(this.fields).map((field) => field.validate()),
    );

    const invalid = validations.some((validation) => validation?.state === "invalid");
    if (invalid) {
      return AGGREGATE_ERROR;
    }
  }
}

export class FormArray<T extends Form<any>> {
  private readonly validators: Validator<InvalidFormSnapshot<T[]>, FormSnapshot<T[]>>[] = [];

  /**
   * An observable list of forms that compose this form.
   */
  @observable.shallow
  readonly rows: T[];

  @observable.ref
  validation?: Validation<InvalidFormSnapshot<T[]>, FormSnapshot<T[]>>;

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
    this.rows = rows;
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
  snapshot(): InvalidFormSnapshot<T[]> {
    return this.rows.map((f) => f.snapshot()) as FormSnapshot<T[]>;
  }

  @action
  async validate(): Promise<Validation<InvalidFormSnapshot<T[]>, FormSnapshot<T[]>>> {
    this.validation = createValidation(() => this.validateAll(), this.validators);
    await this.validation.validate(this.snapshot());
    return this.validation;
  }

  /**
   * Add one or more validators to this form array.
   * @returns self, for chaining
   */
  addValidators(...validators: Validator<InvalidFormSnapshot<T[]>, FormSnapshot<T[]>>[]): this {
    this.validators.push(...validators);
    return this;
  }

  private async validateAll() {
    const validations = await Promise.all(this.rows.map((field) => field.validate()));
    const invalid = validations.some((validation) => validation?.state === "invalid");
    if (invalid) {
      return AGGREGATE_ERROR;
    }
  }
}
