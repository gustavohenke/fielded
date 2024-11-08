import { describe, expect, it, vi } from "vitest";
import { AGGREGATE_ERROR, ValidationError, createStubValidation, validate } from "./validation";
import { when } from "mobx";

describe("validate()", () => {
  it("creates validation with pending state and no errors", () => {
    // use an async validator so that it isn't automatically valid
    const validation = validate("foo", [async () => {}]);
    expect(validation.state).toBe("pending");
    expect(validation.errors).toHaveLength(0);
  });

  it("runs all validators", async () => {
    const v1 = vi.fn();
    const v2 = vi.fn();
    const validation = validate("foo", [v1, { validate: v2 }]);
    await validation.finished;

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
    const validation = validate("foo", [v1, v2, v3]);
    await validation.finished;

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
    const validation = validate("foo", [v1, v2, v3]);
    await validation.finished;

    expect(v1).toHaveBeenCalled();
    expect(v2).toHaveBeenCalled();
    expect(v3).not.toHaveBeenCalled();
  });

  describe("on success", () => {
    it("transitions to valid state", async () => {
      const validation = validate("foo", []);
      await validation.finished;
      expect(validation.state).toBe("valid");
    });

    it("sets validated value", async () => {
      const validation = validate("foo", []);
      await validation.finished;
      if (validation.state === "valid") {
        expect(validation.value).toBe("foo");
      } else {
        // Should not happen. Here only to please typescript
        throw new Error("validation is not valid?");
      }
    });

    it("updates observable state", async () => {
      // use an async validator so that it isn't automatically valid
      const validation = validate("foo", [async () => {}]);
      expect(validation.state).toBe("pending");
      await Promise.all([
        when(() => validation.state === "valid"),
        when(() => validation.value === "foo"),
      ]);
    });
  });

  describe("on error", () => {
    it("transitions to invalid state and sets errors on error", async () => {
      const validation = validate("foo", [
        () => {
          throw "invalid";
        },
      ]);
      await validation.finished;
      expect(validation.state).toBe("invalid");
      expect(validation.errors).toHaveLength(1);
    });

    it("adds errors as mapped from ValidationError", async () => {
      const err = new ValidationError("foo");
      const fromSpy = vi.spyOn(ValidationError, "from").mockReturnValue(err);

      const validation = validate("foo", [
        async () => {
          throw "nope";
        },
      ]);
      await validation.finished;
      expect(validation.errors).toContain(err);

      fromSpy.mockRestore();
    });

    it("updates observable state", async () => {
      // use an async validator so that it isn't automatically invalid
      const validation = validate(1, [
        async () => {
          throw "invalid";
        },
      ]);
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
      const validation = validate(1, [
        () => {
          throw AGGREGATE_ERROR;
        },
      ]);
      await validation.finished;
      expect(validation.state).toBe("invalid");
    });

    it("sets preexisting errors", async () => {
      const validation = validate(1, [
        () => {
          throw new ValidationError("foo", { bail: false });
        },
        () => {
          throw AGGREGATE_ERROR;
        },
      ]);
      await validation.finished;
      expect(validation.errors).toHaveLength(1);
    });

    it("updates observable state", async () => {
      const validation = validate(1, [
        () => {
          throw new ValidationError("foo", { bail: false });
        },
        async () => {
          throw AGGREGATE_ERROR;
        },
      ]);
      expect(validation.state).toBe("pending");
      await Promise.all([
        when(() => validation.state === "invalid"),
        when(() => validation.value === undefined),
        when(() => validation.errors.length === 1),
      ]);
    });
  });
});

describe("createStubValidation()", () => {
  describe("with invalid state", () => {
    it("has state set to invalid", () => {
      const validation = createStubValidation("invalid");
      expect(validation.state).toBe("invalid");
    });

    it("has the provided errors, mapped to ValidationError", () => {
      const errors = [new ValidationError("oh no"), "did not work", new Error("try again")];
      const validation = createStubValidation("invalid", errors);
      expect(validation.errors).toEqual(errors.map((error) => ValidationError.from(error)));
    });
  });

  describe("with valid state", () => {
    it("has state set to valid", () => {
      const validation = createStubValidation("valid");
      expect(validation.state).toBe("valid");
    });

    it("has the provided value", () => {
      const value = {};
      const validation = createStubValidation("valid", value);
      expect(validation.value).toBe(value);
    });
  });

  describe("with pending state", () => {
    it("has state set to pending", () => {
      const validation = createStubValidation("pending");
      expect(validation.state).toBe("pending");
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
