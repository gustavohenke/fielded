import { describe, expect, it, vi } from "vitest";
import { Field } from "./field";

describe("Field", () => {
  describe("#set()", () => {
    it("updates the value of the field", () => {
      const field = Field.number();
      expect(field.value).toBe(undefined);

      field.set(1);
      expect(field.value).toBe(1);
    });
  });

  describe("#error", () => {
    it("is the return value of a validator", () => {
      const field = Field.text().addValidators(() => "nope");
      expect(field.error).toBe("nope");
    });

    it("calls each validator with the current field value", () => {
      const validators = [vi.fn(), vi.fn()];
      const field = Field.text()
        .addValidators(...validators)
        .set("foo");
      field.error;
      expect(validators[0]).toHaveBeenCalledWith("foo");
      expect(validators[1]).toHaveBeenCalledWith("foo");
    });
  });

  describe("#valid", () => {
    it("is true if there is no error", () => {
      const field = Field.text();
      expect(field.valid).toBe(true);
    });

    it("is false if there is an error", () => {
      const field = Field.text().addValidators(() => "nope");
      expect(field.valid).toBe(false);
    });
  });
});
