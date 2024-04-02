import { describe, expect, it, vi } from "vitest";
import { Field } from "./field";
import { when } from "mobx";

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
      const field = Field.text().addValidators(() => Promise.resolve());
      expect(field.validation).toBeUndefined();

      field.validate();
      expect(field.validation).not.toBeUndefined();
    });

    it("triggers validation", async () => {
      const field = Field.text().addValidators(() => Promise.resolve());
      field.validate();
      expect(field.validation!.state).toBe("pending");
      await when(() => field.validation!.state !== "pending");
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
});
