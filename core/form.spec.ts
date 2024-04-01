import { describe, expect, it } from "vitest";
import { Field } from "./field";
import { Form, FormArray } from "./form";
import { ValidationError } from "./validation";

const throwWith = (error: string) => () => {
  throw new Error(error);
};

describe("Form", () => {
  describe("#error", () => {
    it("is the first validation error from a field", () => {
      const form = new Form({
        fruit: Field.text().addValidators(throwWith("Required")),
        color: Field.text().addValidators(throwWith("Nope")),
      });
      form.fields.color.set("red");
      form.fields.fruit.set("apple");

      expect(form.error).toEqual(new ValidationError("Required"));
    });

    it("is the first validation error from a nested form", () => {
      const form = new Form({
        fruit: Field.text().addValidators(() => void 0),
        nutrition: new Form({
          energy: Field.number().addValidators(throwWith("Required")),
        }),
      });
      form.fields.fruit.set("apple");
      form.fields.nutrition.fields.energy.set(undefined);

      expect(form.error).toEqual(new ValidationError("Required"));
    });

    it("is the first validation error from a nested list of forms", () => {
      const form = new Form({
        protein: Field.text().addValidators(() => void 0),
        recipes: new FormArray([
          new Form({ name: Field.text().addValidators(throwWith("Required")) }),
        ]),
      });
      form.fields.protein.set(undefined);
      form.fields.recipes.rows[0].fields.name.set(undefined);

      expect(form.error).toEqual(new ValidationError("Required"));
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
});

describe("FormArray", () => {
  describe("#error", () => {
    it("is the first validation error from a nested list of forms", () => {
      const array = new FormArray([
        new Form({
          name: Field.text().addValidators(throwWith("Required")),
        }),
      ]);
      array.rows[0].fields.name.set("");
      expect(array.error).toEqual(new ValidationError("Required"));
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
});
