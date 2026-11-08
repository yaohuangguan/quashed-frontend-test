// Step 1: "<Provider> Purchase Form". Which questions appear, and in which
// order, comes from the provider's purchase options.
import { Fragment, useId, useState, type ReactNode } from "react";
import { purchaseDetailsSchema, type PurchaseDetails } from "@shared/purchase.ts";
import type { PurchaseField, PurchaseOptions } from "@shared/providers.ts";
import { Button } from "../../components/Button.tsx";
import { ButtonsPane } from "../../components/ButtonsPane.tsx";
import { ChipGroup } from "../../components/ChipGroup.tsx";
import { describedBy, Field } from "../../components/Field.tsx";
import { PickerInput } from "../../components/PickerInput.tsx";
import { SelectField } from "../../components/SelectField.tsx";
import { TextInput } from "../../components/TextInput.tsx";
import { useValidation } from "../../hooks/purchase/use-validation.ts";
import { isoToMaskedDate, maskDate, parseMaskedDate } from "../../lib/masks.ts";
import { messages } from "../../locales/en.ts";
import { AddressField } from "./AddressField.tsx";
import { FlyoutHeader } from "./FlyoutHeader.tsx";

const t = messages.purchase;

type DetailsStepProps = {
  options: PurchaseOptions;
  /** Answers to show again after going back from payment. */
  previous?: PurchaseDetails;
  onContinue: (details: PurchaseDetails) => void;
  onCancel: () => void;
  onDisconnect: () => void;
};

export function DetailsStep({ options, previous, onContinue, onCancel, onDisconnect }: DetailsStepProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const { form } = options;
  const asks = (field: PurchaseField) => form.fields.includes(field);

  const [firstName, setFirstName] = useState(previous?.firstName ?? "");
  const [surname, setSurname] = useState(previous?.surname ?? "");
  const [address, setAddress] = useState(previous?.address ?? "");
  const [dataPlan, setDataPlan] = useState(previous?.dataPlan);
  const [startDate, setStartDate] = useState(previous ? isoToMaskedDate(previous.contractStartDate) : "");
  const [services, setServices] = useState<string[]>(previous?.additionalServices ?? []);
  const [needsRouter, setNeedsRouter] = useState(previous?.needsRouter);
  const [currentProvider, setCurrentProvider] = useState(previous?.currentProvider);

  const candidate = {
    firstName,
    surname,
    address,
    dataPlan,
    contractStartDate: parseMaskedDate(startDate) ?? startDate,
    ...(asks("additionalServices") ? { additionalServices: services } : {}),
    ...(asks("needsRouter") ? { needsRouter } : {}),
    ...(asks("currentProvider") ? { currentProvider } : {}),
  };
  const { data, errorFor, touch } = useValidation(
    purchaseDetailsSchema(form, options.earliestStartDate),
    candidate,
  );

  const fieldId = (name: string) => `${id}-${name}`;

  const questions: Record<PurchaseField, () => ReactNode> = {
    dataPlan: () => (
      <Field id={fieldId("dataPlan")} label={t.dataPlan} error={errorFor("dataPlan")} asGroup>
        <ChipGroup
          labelId={`${fieldId("dataPlan")}-label`}
          mode="single"
          options={form.dataPlans}
          selected={dataPlan ? [dataPlan] : []}
          onChange={([plan]) => setDataPlan(plan)}
          onBlur={() => touch("dataPlan")}
        />
      </Field>
    ),
    contractStartDate: () => (
      <Field id={fieldId("start")} label={t.contractStartDate} error={errorFor("contractStartDate")}>
        <PickerInput
          id={fieldId("start")}
          kind="date"
          value={startDate}
          placeholder={t.datePlaceholder}
          pickerLabel={t.openCalendar}
          min={options.earliestStartDate}
          error={errorFor("contractStartDate")}
          mask={maskDate}
          fromPicker={isoToMaskedDate}
          onChange={setStartDate}
          onBlur={() => touch("contractStartDate")}
        />
      </Field>
    ),
    additionalServices: () => (
      <Field id={fieldId("services")} label={t.additionalServices} error={errorFor("additionalServices")} asGroup>
        <ChipGroup
          labelId={`${fieldId("services")}-label`}
          mode="multi"
          options={form.additionalServices}
          selected={services}
          onChange={setServices}
        />
      </Field>
    ),
    needsRouter: () => (
      <Field id={fieldId("router")} label={t.needsRouter} error={errorFor("needsRouter")} asGroup>
        <ChipGroup
          labelId={`${fieldId("router")}-label`}
          mode="single"
          wide
          options={["yes", "no"]}
          optionLabel={(option) => (option === "yes" ? t.yes : t.no)}
          selected={needsRouter === undefined ? [] : [needsRouter ? "yes" : "no"]}
          onChange={([answer]) => setNeedsRouter(answer === "yes")}
          onBlur={() => touch("needsRouter")}
        />
      </Field>
    ),
    currentProvider: () => (
      <Field id={fieldId("current")} label={t.currentProvider} error={errorFor("currentProvider")} asGroup>
        <SelectField
          id={fieldId("current")}
          labelId={`${fieldId("current")}-label`}
          options={options.currentProviders}
          value={currentProvider}
          placeholder={t.select}
          error={errorFor("currentProvider")}
          onChange={setCurrentProvider}
          onBlur={() => touch("currentProvider")}
        />
      </Field>
    ),
  };

  return (
    <form
      className="flyout__form"
      aria-labelledby={titleId}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (data) onContinue(data);
      }}
    >
      <FlyoutHeader titleId={titleId} title={t.formTitle(options.providerName)} onDisconnect={onDisconnect} />
      <div className="flyout__body">
        <div className="form-row">
          <Field id={fieldId("first")} label={t.firstName} error={errorFor("firstName")}>
            <TextInput
              id={fieldId("first")}
              autoComplete="given-name"
              placeholder={t.firstNamePlaceholder}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={() => touch("firstName")}
              {...describedBy(fieldId("first"), errorFor("firstName"))}
            />
          </Field>
          <Field id={fieldId("surname")} label={t.surname} error={errorFor("surname")}>
            <TextInput
              id={fieldId("surname")}
              autoComplete="family-name"
              placeholder={t.surnamePlaceholder}
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              onBlur={() => touch("surname")}
              {...describedBy(fieldId("surname"), errorFor("surname"))}
            />
          </Field>
        </div>
        <div className="form-row form-row--single">
          <Field id={fieldId("address")} label={t.address} error={errorFor("address")}>
            <AddressField
              id={fieldId("address")}
              value={address}
              placeholder={t.addressPlaceholder}
              error={errorFor("address")}
              onChange={setAddress}
              onBlur={() => touch("address")}
            />
          </Field>
        </div>
        <div className="form-row">
          {form.fields.map((field) => (
            <Fragment key={field}>{questions[field]()}</Fragment>
          ))}
        </div>
      </div>
      <ButtonsPane>
        <Button variant="text" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" withArrow disabled={!data}>
          {t.continue}
        </Button>
      </ButtonsPane>
    </form>
  );
}
