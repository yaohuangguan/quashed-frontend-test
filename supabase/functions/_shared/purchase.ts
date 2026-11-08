// Validation rules for the purchase flow. The web app uses them to enable the
// buttons and show field errors; the API uses the same rules to reject bad
// requests, so the two can never disagree.
import { z } from "zod";
import { isMonthInPast } from "./dates.ts";
import { CURRENT_PROVIDERS, type PurchaseField, type PurchaseForm } from "./providers.ts";

export const LIMITS = {
  nameLength: 100,
  addressLength: 200,
  feedbackLength: 2000,
  addressQueryLength: 100,
} as const;

const REQUIRED = "Required";
const CHOOSE = "Choose an option";

const personName = z.string({ error: REQUIRED }).trim().min(1, REQUIRED).max(LIMITS.nameLength, "Too long");

/** z.enum needs at least one option; an empty list accepts nothing. */
function oneOf(options: readonly string[]) {
  return options.length > 0 ? z.enum(options as [string, ...string[]], { error: CHOOSE }) : z.never({ error: CHOOSE });
}

/** A question the provider does not ask must be left out. */
function askedOrAbsent<T extends z.ZodType>(form: PurchaseForm, field: PurchaseField, schema: T) {
  return form.fields.includes(field) ? schema : z.undefined().optional();
}

/** Step 1 of the fly-out: personal details and plan choices. */
export function purchaseDetailsSchema(form: PurchaseForm, earliestStartDate: string) {
  return z.strictObject({
    firstName: personName,
    surname: personName,
    address: z.string({ error: REQUIRED }).trim().min(1, REQUIRED).max(LIMITS.addressLength, "Too long"),
    dataPlan: oneOf(form.dataPlans),
    contractStartDate: z.iso
      .date({ error: "Enter a valid date" })
      .refine((date) => date >= earliestStartDate, "Choose today or a later date"),
    additionalServices: askedOrAbsent(
      form,
      "additionalServices",
      z
        .array(oneOf(form.additionalServices))
        .max(form.additionalServices.length)
        .refine((items) => new Set(items).size === items.length, "Duplicate service"),
    ),
    needsRouter: askedOrAbsent(form, "needsRouter", z.boolean({ error: CHOOSE })),
    currentProvider: askedOrAbsent(form, "currentProvider", oneOf(CURRENT_PROVIDERS)),
  });
}

export type PurchaseDetails = {
  firstName: string;
  surname: string;
  address: string;
  dataPlan: string;
  contractStartDate: string;
  additionalServices?: string[];
  needsRouter?: boolean;
  currentProvider?: string;
};

const VALID_MONTH = "Enter a valid month";

const expiryFields = {
  expiryMonth: z.number({ error: VALID_MONTH }).int(VALID_MONTH).min(1, VALID_MONTH).max(12, VALID_MONTH),
  expiryYear: z.number({ error: VALID_MONTH }).int(VALID_MONTH).min(2000, VALID_MONTH).max(2100, VALID_MONTH),
  cardHolder: personName,
};

const EXPIRED = { path: ["expiryMonth"], message: "This card has expired" };

function notExpired(now: Date) {
  return (card: { expiryMonth: number; expiryYear: number }) => !isMonthInPast(card.expiryMonth, card.expiryYear, now);
}

/**
 * Step 2 of the fly-out, as typed in the browser. Payment is a demo: the full
 * card number and the CVV are checked here and never leave the browser.
 */
export function cardFormSchema(now: Date) {
  return z
    .strictObject({
      cardNumber: z
        .string({ error: REQUIRED })
        .transform((value) => value.replace(/\s/g, ""))
        .pipe(z.string().regex(/^\d{13,19}$/, "Enter a valid card number")),
      cvv: z.string({ error: REQUIRED }).regex(/^\d{3,4}$/, "Enter 3 or 4 digits"),
      ...expiryFields,
    })
    .refine(notExpired(now), EXPIRED);
}

export type CardForm = z.infer<ReturnType<typeof cardFormSchema>>;

/** What the API receives about the card: no full number, no CVV. */
export function paymentSchema(now: Date) {
  return z
    .strictObject({
      cardLast4: z.string({ error: REQUIRED }).regex(/^\d{4}$/, "Enter the last 4 digits"),
      ...expiryFields,
    })
    .refine(notExpired(now), EXPIRED);
}

export type PaymentDetails = {
  cardLast4: string;
  expiryMonth: number;
  expiryYear: number;
  cardHolder: string;
};

/** Drops everything the API must not receive. */
export function toPaymentDetails(card: CardForm): PaymentDetails {
  return {
    cardLast4: card.cardNumber.slice(-4),
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
    cardHolder: card.cardHolder,
  };
}

export const createConnectionSchema = z.strictObject({
  providerId: z.string().regex(/^[a-z0-9-]{1,40}$/),
});

export const createOrderSchema = z.strictObject({
  connectionId: z.uuid(),
  details: z.unknown(),
  payment: z.unknown(),
});

export const feedbackSchema = z.strictObject({
  orderId: z.uuid(),
  message: z.string({ error: REQUIRED }).trim().min(1, REQUIRED).max(LIMITS.feedbackLength, "Too long"),
});

export type CreateConnectionResponse = { connectionId: string };

export type CreateOrderResponse = {
  orderId: string;
  providerName: string;
  contractStartDate: string;
};

/** Flattens zod issues into "path: message" pairs for an error response. */
export function toFieldErrors(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}
