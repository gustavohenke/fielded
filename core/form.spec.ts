import { when } from "mobx";
import { describe, expect, it, vi } from "vitest";
import { Field } from "./field";
import { Form, FormArray } from "./form";

describe("Form", () => {
  describe("#errors", () => {
    it("is empty when the form has not been validated", async () => {
      const form = new Form({}).addValidators(() => Promise.reject("nope"));
      expect(form.errors).toHaveLength(0);

      form.validate();
      await when(() => form.errors.length > 0);
    });
  });

  describe("#snapshot()", () => {
    it("returns the value of each field", () => {
      const form = new Form({
        fruit: Field.text("banana"),
        sweetness: Field.number(3),
        color: Field.text(),
      });

      expect(form.snapshot()).toEqual({
        fruit: "banana",
        sweetness: 3,
        color: undefined,
      });
    });

    it("recursively snapshots other forms", () => {
      const form = new Form({
        fruit: Field.text("banana"),
        nutrition: new Form({
          energy: Field.number(0),
        }),
      });

      expect(form.snapshot()).toEqual({
        fruit: "banana",
        nutrition: {
          energy: 0,
        },
      });
    });

    it("recursively snapshots form arrays", () => {
      const form = new Form({
        protein: Field.text("chicken"),
        recipes: new FormArray([
          new Form({
            name: Field.text("butter chicken"),
          }),
        ]),
      });

      expect(form.snapshot()).toEqual({
        protein: "chicken",
        recipes: [{ name: "butter chicken" }],
      });
    });
  });

  describe("#reset()", () => {
    it("removes validation state", () => {
      const form = new Form({
        fruit: Field.text("banana"),
      });
      form.validate();
      form.reset();
      expect(form.validation).toBeUndefined();
    });

    it("resets each nested field", () => {
      const fruit = Field.text();
      vi.spyOn(fruit, "reset");

      const form = new Form({ fruit });
      form.reset();
      expect(fruit.reset).toHaveBeenCalled();
    });

    it("resets each nested form", () => {
      const nested = new Form({});
      vi.spyOn(nested, "reset");

      const form = new Form({ nested });
      form.reset();
      expect(nested.reset).toHaveBeenCalled();
    });

    it("resets each nested form array", () => {
      const nested = new FormArray();
      vi.spyOn(nested, "reset");

      const form = new Form({ nested });
      form.reset();
      expect(nested.reset).toHaveBeenCalled();
    });
  });

  describe("#validate()", () => {
    it("sets #validation", () => {
      const form = new Form({});
      expect(form.validation).toBeUndefined();

      form.validate();
      expect(form.validation).not.toBeUndefined();
    });

    it("triggers validation on all nested fields, forms and list of forms", async () => {
      const validator = vi.fn();
      const form = new Form({
        name: Field.text().addValidators(validator),
        address: new Form({}).addValidators(validator),
        pets: new FormArray([]).addValidators(validator),
      });
      expect(form.fields.name.validation).toBeUndefined();
      expect(form.fields.address.validation).toBeUndefined();
      expect(form.fields.pets.validation).toBeUndefined();

      form.validate();
      expect(form.fields.name.validation).not.toBeUndefined();
      expect(form.fields.address.validation).not.toBeUndefined();
      expect(form.fields.pets.validation).not.toBeUndefined();

      expect(form.validation?.state).toBe("pending");
      await when(() => form.validation?.state !== "pending");
      expect(validator).toHaveBeenCalledTimes(3);
    });

    it("triggers own validators", async () => {
      const validator = vi.fn(() => Promise.resolve());
      const form = new Form({}).addValidators(validator);
      form.validate();
      expect(form.validation?.state).toBe("pending");
      await when(() => form.validation?.state !== "pending");
      expect(validator).toHaveBeenCalledTimes(1);
    });

    it("returns the finished validation", async () => {
      const field = new Form({}).addValidators(() => Promise.resolve());
      const result = await field.validate();
      expect(result.state).toBe("valid");
    });
  });
});

describe("FormArray", () => {
  describe("#errors", () => {
    it("is empty when the array has not been validated", async () => {
      const array = new FormArray([]).addValidators(() => Promise.reject("nope"));
      expect(array.errors).toHaveLength(0);

      array.validate();
      await when(() => array.errors.length > 0);
    });
  });

  describe("#add()", () => {
    it("adds one or more rows", () => {
      const array = new FormArray<Form<{}>>();
      array.add(new Form({}));
      expect(array.rows).toHaveLength(1);

      array.add(new Form({}), new Form({}));
      expect(array.rows).toHaveLength(3);
    });
  });

  describe("#remove()", () => {
    it("removes a row by index", () => {
      const form1 = new Form({ name: Field.text() });
      const form2 = new Form({ name: Field.text() });
      const array = new FormArray([form1, form2]);
      array.remove(1);
      expect(array.rows).toHaveLength(1);
      expect(array.rows).toContain(form1);
    });

    it("removes a row by reference", () => {
      const form1 = new Form({ name: Field.text() });
      const form2 = new Form({ name: Field.text() });
      const array = new FormArray([form1, form2]);
      array.remove(form2);
      expect(array.rows).toHaveLength(1);
      expect(array.rows).toContain(form1);
    });
  });

  describe("#snapshot()", () => {
    it("recursively snapshots each form", () => {
      const recipes = new FormArray([
        new Form({ name: Field.text("butter chicken") }),
        new Form({ name: Field.text("chicken stroganoff") }),
        new Form({ name: Field.text() }),
      ]);

      expect(recipes.snapshot()).toEqual([
        { name: "butter chicken" },
        { name: "chicken stroganoff" },
        { name: undefined },
      ]);
    });
  });

  describe("#reset()", () => {
    it("removes validation state", () => {
      const array = new FormArray([]);
      array.validate();
      array.reset();
      expect(array.validation).toBeUndefined();
    });

    it("removes excess rows", () => {
      const array = new FormArray([new Form({})]);
      array.add(new Form({}));
      array.reset();
      expect(array.rows).toHaveLength(1);
    });

    it("adds missing rows", () => {
      const array = new FormArray([new Form({})]);
      array.remove(0);
      array.reset();
      expect(array.rows).toHaveLength(1);
    });

    it("resets each nested form", () => {
      const nested = new Form({});
      vi.spyOn(nested, "reset");

      const array = new FormArray([nested]);
      array.reset();
      expect(nested.reset).toHaveBeenCalled();
    });
  });

  describe("#validate()", () => {
    it("sets #validation", () => {
      const array = new FormArray([]);
      expect(array.validation).toBeUndefined();

      array.validate();
      expect(array.validation).not.toBeUndefined();
    });

    it("triggers validation on all nested forms", async () => {
      const validator = vi.fn();
      const array = new FormArray([
        new Form({}).addValidators(validator),
        new Form({}).addValidators(validator),
      ]);
      expect(array.rows[0].validation).toBeUndefined();
      expect(array.rows[1].validation).toBeUndefined();

      array.validate();
      expect(array.rows[0].validation).not.toBeUndefined();
      expect(array.rows[1].validation).not.toBeUndefined();

      expect(array.validation?.state).toBe("pending");
      await when(() => array.validation?.state !== "pending");
      expect(validator).toHaveBeenCalledTimes(2);
    });

    it("triggers own validators", async () => {
      const validator = vi.fn(() => Promise.resolve());
      const array = new FormArray([]).addValidators(validator);
      array.validate();
      expect(array.validation?.state).toBe("pending");
      await when(() => array.validation?.state !== "pending");
      expect(validator).toHaveBeenCalledTimes(1);
    });

    it("returns the finished validation", async () => {
      const field = new FormArray([]).addValidators(() => Promise.resolve());
      const result = await field.validate();
      expect(result.state).toBe("valid");
    });
  });
});
