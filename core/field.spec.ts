import { when } from "mobx";
import { describe, expect, it, vi } from "vitest";
import { Field } from "./field";
import { ValidationError } from "./validation";

describe("Field", () => {
  it("is validated on instantiation", async () => {
    const validator = vi.fn(() => Promise.resolve());
    const field = Field.fromValidator(validator);
    expect(validator).toHaveBeenCalled();
    expect(field.validation.state).toBe("pending");
    await when(() => field.validation.state === "valid");
  });

  describe("#set()", () => {
    it("updates the raw value of the field", () => {
      const field = Field.number();
      expect(field.rawValue).toBe(undefined);

      field.set(1);
      expect(field.rawValue).toBe(1);
    });

    it("triggers validation", () => {
      const field = Field.text().addValidators(() => {});
      vi.spyOn(field, "validate");
      field.set("foo");
      expect(field.validate).toHaveBeenCalledTimes(1);
    });
  });

  describe("#value", () => {
    it("is undefined, if the field is invalid", () => {
      const field = Field.text().addValidators(() => {
        throw new Error("nope");
      });
      expect(field.value).toBeUndefined();

      field.set("foo");
      expect(field.value).toBeUndefined();
    });

    it("is the valid value of the field", () => {
      const field = Field.text();
      expect(field.value).toBeUndefined();

      field.set("foo");
      expect(field.value).toBe("foo");
    });
  });

  describe("#reset()", () => {
    it("sets initial value", () => {
      const field = Field.text("foo");
      field.set("bar").reset();
      expect(field.rawValue).toBe("foo");
    });

    it("revalidates", async () => {
      const field = Field.text("foo").addValidators((val) => {
        if (val === "bar") {
          throw "nope";
        }
      });
      field.set("bar");

      expect(field.validation.state).toBe("invalid");
      field.reset();
      expect(field.validation.state).toBe("valid");
    });
  });

  describe("#validate()", () => {
    it("resets #validation if it had been changed through #setError()", async () => {
      const field = Field.text();
      const original = field.validation;
      field.setError("oh no");
      field.validate();
      expect(field.validation).toBe(original);
    });

    it("triggers validation", async () => {
      const validator = vi.fn(() => Promise.resolve());
      const field = Field.text().addValidators(validator);
      await when(() => field.validation.state !== "pending");

      field.validate();
      expect(field.validation.state).toBe("pending");
      await when(() => field.validation.state !== "pending");
      expect(validator).toHaveBeenCalledTimes(2);
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
    it("changes the validation state of the field", () => {
      const field = Field.number();
      const original = field.validation;
      field.setError("nope");
      expect(field.validation).not.toBe(original);
    });

    it("marks the field invalid with the given error", () => {
      const field = Field.number();
      field.setError("nope");
      expect(field.validation.state).toBe("invalid");
      expect(field.error).toEqual(ValidationError.from("nope"));
    });
  });
});
