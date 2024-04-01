import { action, computed, makeObservable, observable } from "mobx";
import { Field } from "./field";
import { ValidationError } from "./validation";

/**
 * A map from field name to its state, in the form of either `Field`, `Form` or `FormArray`.
 */
export type FormDataMap = Record<string, Field<any> | Form<any> | FormArray<any>>;

export type FormData = FormDataMap | Form<any>[];

/**
 * The snapshot type of a field.
 */
export type FieldSnapshot<T extends Field<any>> = T["value"];

/**
 * The snapshot type of a form.
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

export class Form<T extends FormDataMap> {
  /**
   * An object of fields that compose this form.
   */
  readonly fields: T;

  /**
   * Observable, first validation error from any of the nested forms/fields.
   */
  get error(): ValidationError | undefined {
    return this.errors[0];
  }

  /**
   * Observable list of validation errors from any of the nested forms/fields.
   */
  @computed
  get errors(): readonly ValidationError[] {
    return Object.values(this.fields).flatMap((field) => field.errors);
  }

  /**
   * Whether the form is valid.
   */
  @computed
  get valid() {
    return this.error == null;
  }

  constructor(fields: T) {
    this.fields = fields;
  }

  /**
   * Recursively snapshots the current state of the form and returns it.
   */
  snapshot(): FormSnapshot<T> {
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
}

export class FormArray<T extends Form<any>> {
  /**
   * An observable list of forms that compose this form.
   */
  @observable.shallow
  readonly rows: T[];

  /**
   * Observable, first validation error from any of nested the forms/fields.
   */
  get error(): ValidationError | undefined {
    return this.errors[0];
  }

  /**
   * Observable list of validation errors from all of the nested the forms/fields.
   */
  @computed
  get errors(): readonly ValidationError[] {
    return Object.values(this.rows).flatMap((row) => row.errors);
  }

  /**
   * Whether the form list is valid.
   */
  @computed
  get valid() {
    return this.error == null;
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
  snapshot(): FormSnapshot<T[]> {
    return this.rows.map((f) => f.snapshot()) as FormSnapshot<T[]>;
  }
}
