import { when } from "mobx";
import { describe, expect, it, vi } from "vitest";
import { Field } from "./field";
import { ValidationError } from "./validation";

describe("Field", () => {
  describe("#set()", () => {
    it("updates the value of the field", () => {
      const field = Field.number();
      expect(field.value).toBe(undefined);

      field.set(1);
      expect(field.value).toBe(1);
    });

    it("triggers validation", () => {
      const field = Field.text().addValidators(() => {});
      vi.spyOn(field, "validate");
      field.set("foo");
      expect(field.validate).toHaveBeenCalledTimes(1);
    });
  });

  describe("#validate()", () => {
    it("sets #validation", async () => {
      const field = Field.text();
      expect(field.validation).toBeUndefined();

      field.validate();
      expect(field.validation).not.toBeUndefined();
    });

    it("triggers validation", async () => {
      const validator = vi.fn(() => Promise.resolve());
      const field = Field.text().addValidators(validator);
      field.validate();
      expect(field.validation!.state).toBe("pending");
      await when(() => field.validation!.state !== "pending");
      expect(validator).toHaveBeenCalledTimes(1);
    });

    it("returns the finished validation", async () => {
      const field = Field.text().addValidators(() => Promise.resolve());
      const result = await field.validate();
      expect(result.state).toBe("valid");
    });
  });

  describe("#errors", () => {
    it("is empty when the field has not been validated", async () => {
      const field = Field.text().addValidators(() => Promise.reject("nope"));
      expect(field.errors).toHaveLength(0);

      field.set("foo");
      await when(() => field.errors.length > 0);
    });
  });

  describe("#error", () => {
    it("is unset until the field is set", async () => {
      const field = Field.text().addValidators(() => Promise.reject("nope"));
      expect(field.error).toBeUndefined();

      field.set("foo");
      await when(() => !!field.error);
    });
  });

  describe("#addValidators()", () => {
    it("creates a new field instance", () => {
      const f1 = Field.text();
      const f2 = f1.addValidators();
      const f3 = f2.addValidators();
      expect(f1).not.toBe(f2);
      expect(f2).not.toBe(f3);
    });

    it("appends validators", async () => {
      const v1 = vi.fn();
      const v2 = vi.fn();
      await Field.text().addValidators(v1).addValidators(v2).validate();
      expect(v1.mock.invocationCallOrder[0]).toBeLessThan(v2.mock.invocationCallOrder[0]);
    });

    it("creates a new field of different generic type", () => {
      const f1 = Field.number();
      const f2: Field<1 | 2> = f1.addValidators(
        (val: number | undefined): asserts val is 1 | 2 => {},
      );
      const f3: Field<1> = f2.addValidators((val: 1 | 2): asserts val is 1 => {});
    });

    it("does not compile if the validator does not apply to the field type", () => {
      Field.number()
        // @ts-expect-error
        .addValidators((val: number | undefined): asserts val is "foo" => {});
    });
  });

  describe("#setError()", () => {
    it("sets the validation state of the field", () => {
      const field = Field.number();
      expect(field.validation).toBeUndefined();

      field.setError("nope");
      expect(field.validation).not.toBeUndefined();
    });

    it("marks the field invalid with the given error", () => {
      const field = Field.number();
      field.setError("nope");
      expect(field.validation?.state).toBe("invalid");
      expect(field.error).toEqual(ValidationError.from("nope"));
    });
  });
});
