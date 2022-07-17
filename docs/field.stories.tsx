import { observer } from "mobx-react";
import React from "react";
import { Field } from "../core/field";
import { Form, FormArray } from "../core/form";

const Debug = observer(({ form }: { form: Form<any> }) => (
  <div style={{ marginTop: 15 }}>
    This form's value is:<pre>{JSON.stringify(form.snapshot(), null, 2)}</pre>
  </div>
));

const Input = observer(({ label, field }: { label: string; field: Field<any> }) => {
  return (
    <div style={{ marginTop: 5 }}>
      <label>{label}</label>
      <br />
      <input {...field.getReactProps()} />
    </div>
  );
});

const FormRows = observer(function <T extends Form<any>>({
  rows,
  children,
}: {
  rows: T[];
  children(row: T, index: number): React.ReactNode;
}) {
  return (
    <>
      {rows.map((row, i) => (
        <div key={i}>{children(row, i)}</div>
      ))}
    </>
  );
});

export const Default = () => {
  const form = new Form({
    name: Field.text(),
    age: Field.number(),
  });

  return (
    <>
      <Input label="Name" field={form.fields.name} />
      <Input label="Age" field={form.fields.age} />
      <Debug form={form} />
    </>
  );
};

export const FormLists = () => {
  class PetForm extends Form<{ name: Field<string> }> {
    constructor(name?: string) {
      super({ name: Field.text(name) });
    }
  }

  const form = new Form({
    ownerName: Field.text(),
    pets: new FormArray([new PetForm("Rex")]),
  });

  const addPet = () => form.fields.pets.add(new PetForm());
  const removePet = (index: number) => form.fields.pets.remove(index);

  return (
    <>
      <Input label="Owner name" field={form.fields.ownerName} />
      <FormRows rows={form.fields.pets.rows}>
        {(pet, i) => (
          <fieldset>
            <legend>Pet #{i + 1}</legend>
            <Input label="Name" field={pet.fields.name} />
            <button onClick={() => removePet(i)}>Remove</button>
          </fieldset>
        )}
      </FormRows>
      <button onClick={addPet}>Add pet</button>
      <Debug form={form} />
    </>
  );
};

export default { title: "Form" };
