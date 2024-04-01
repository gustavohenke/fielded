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

    it("triggers validation", async () => {
      const field = Field.text().addValidators(() => Promise.reject("nope"));
      field.set("foo");
      expect(field.validation!.state).toBe("pending");

      await when(() => field.validation!.state !== "pending");
    });
  });

  describe("#validation", () => {
    it("is unset until value is set", () => {
      const field = Field.text().addValidators(() => Promise.reject("nope"));
      expect(field.validation).toBeUndefined();

      field.set("foo");
      expect(field.validation).not.toBeUndefined();
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
