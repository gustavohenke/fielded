import { describe, expect, it, vi } from "vitest";
import { AGGREGATE_ERROR, ValidationError, createValidation } from "./validation";
import { when } from "mobx";

describe("createValidation()", () => {
  it("does not run validators on creation", () => {
    const validator = vi.fn();
    createValidation(validator);
    expect(validator).not.toHaveBeenCalled();
  });

  it("is created with pending state and no errors", () => {
    const validation = createValidation([vi.fn()]);
    expect(validation.state).toBe("pending");
    expect(validation.errors).toHaveLength(0);
  });

  describe("#validate()", () => {
    it("runs all validators", async () => {
      const v1 = vi.fn();
      const v2 = vi.fn();
      const validation = createValidation(v1, { validate: v2 });
      await validation.validate("foo");

      expect(v1).toHaveBeenCalledTimes(1);
      expect(v1).toHaveBeenCalledWith("foo");
      expect(v2).toHaveBeenCalledTimes(1);
      expect(v2).toHaveBeenCalledWith("foo");
    });

    it("runs validators until a bail error is thrown", async () => {
      const v1 = vi.fn();
      const v2 = vi.fn(() => {
        throw new ValidationError("fail", { bail: true });
      });
      const v3 = vi.fn();
      const validation = createValidation(v1, v2, v3);
      await validation.validate("foo");

      expect(v1).toHaveBeenCalled();
      expect(v2).toHaveBeenCalled();
      expect(v3).not.toHaveBeenCalled();
    });

    it("runs validators until an AGGREGATE_ERROR is returned", async () => {
      const v1 = vi.fn();
      const v2 = vi.fn(() => {
        throw AGGREGATE_ERROR;
      });
      const v3 = vi.fn();
      const validation = createValidation(v1, v2, v3);
      await validation.validate("foo");

      expect(v1).toHaveBeenCalled();
      expect(v2).toHaveBeenCalled();
      expect(v3).not.toHaveBeenCalled();
    });

    it("transitions back to pending state and resets errors while validating", async () => {
      const validator = vi.fn().mockRejectedValue("invalid");
      const validation = createValidation(validator);
      await validation.validate("foo");

      const validPromise = validation.validate("foob");
      expect(validation.state).toBe("pending");
      expect(validation.errors).toHaveLength(0);

      await validPromise;
      validation.validate("fooba");

      expect(validation.state).toBe("pending");
      expect(validation.value).toBeUndefined();
    });

    describe("on success", () => {
      it("transitions to valid state", async () => {
        const validation = createValidation();
        await validation.validate("foo");
        expect(validation.state).toBe("valid");
      });

      it("sets validated value", async () => {
        const validation = createValidation();
        await validation.validate("foo");
        if (validation.state === "valid") {
          expect(validation.value).toBe("foo");
        } else {
          // Should not happen. Here only to please typescript
          throw new Error("validation is not valid?");
        }
      });

      it("updates observable state", async () => {
        const validation = createValidation(async (x) => x);
        validation.validate("foo");
        expect(validation.state).toBe("pending");
        await Promise.all([
          when(() => validation.state === "valid"),
          when(() => validation.value === "foo"),
        ]);
      });
    });

    describe("on error", () => {
      it("transitions to invalid state and sets errors on error", async () => {
        const validation = createValidation(() => {
          throw "invalid";
        });
        await validation.validate("foo");
        expect(validation.state).toBe("invalid");
        expect(validation.errors).toHaveLength(1);
      });

      it("adds errors as mapped from ValidationError", async () => {
        const err = new ValidationError("foo");
        const fromSpy = vi.spyOn(ValidationError, "from").mockReturnValue(err);

        const validation = createValidation(async () => {
          throw "nope";
        });
        await validation.validate("foo");
        expect(validation.errors).toContain(err);

        fromSpy.mockRestore();
      });

      it("updates observable state", async () => {
        const validation = createValidation(async () => {
          throw "invalid";
        });
        validation.validate("foo");
        expect(validation.state).toBe("pending");
        await Promise.all([
          when(() => validation.state === "invalid"),
          when(() => validation.value === undefined),
          when(() => validation.errors.length > 0),
        ]);
      });
    });

    describe("on AGGREGATE_ERROR", () => {
      it("transitions to invalid state and sets whatever errors", async () => {
        const validation = createValidation(
          () => {
            throw new ValidationError("foo", { bail: false });
          },
          () => AGGREGATE_ERROR,
        );
        await validation.validate("foo");
        expect(validation.state).toBe("invalid");
        expect(validation.errors).toHaveLength(1);
      });

      it("updates observable state", async () => {
        const validation = createValidation(
          () => {
            throw new ValidationError("foo", { bail: false });
          },
          async () => AGGREGATE_ERROR,
        );
        validation.validate("foo");
        expect(validation.state).toBe("pending");
        await Promise.all([
          when(() => validation.state === "invalid"),
          when(() => validation.value === undefined),
          when(() => validation.errors.length === 1),
        ]);
      });
    });
  });

  describe("#hasError", () => {
    it("is true when #errors has something", () => {
      const validation = createValidation(() => {
        throw new Error("oh no");
      });
      validation.validate(1);
      expect(validation.hasError).toBe(true);
    });

    it("is false when #errors has nothing", () => {
      const validation = createValidation(() => {});
      validation.validate(1);
      expect(validation.hasError).toBe(false);
    });

    it("is observable", async () => {
      const validator = vi.fn(async () => {
        throw new Error();
      });
      const validation = createValidation(validator);
      validation.validate(1);
      expect(validation.hasError).toBe(false);
      await when(() => validation.hasError);
    });
  });
});

describe("ValidationError", () => {
  describe(".from()", () => {
    it("returns ValidationErrors as is", () => {
      const err = new ValidationError("error");
      expect(ValidationError.from(err)).toBe(err);
    });

    it("converts other errors", async () => {
      const base = new Error("invalid");
      const err = ValidationError.from(base);
      expect(err.cause).toBe(base);
      expect(err.bail).toBe(true);
      expect(err.message).toBe(err.message);
    });

    it("converts non-errors", async () => {
      const base = "invalid";
      const err = ValidationError.from(base);
      expect(err.cause).toBe(base);
      expect(err.bail).toBe(true);
      expect(err.message).toBe(err.message);
    });
  });
});
