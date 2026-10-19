// lib/onboarding/schemas.ts
import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

const ENTER_AMOUNT = "Enter an amount";

// Blank is undefined or NaN (the currency field clears to NaN).
// min 0 treats blank as empty. min > 0 asks for an amount in plain language.
const num = (min = 0) =>
  z
    .union([z.number(), z.nan()])
    .optional()
    .transform((value, ctx) => {
      const blank =
        value === undefined || (typeof value === "number" && Number.isNaN(value));

      if (blank) {
        if (min > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: ENTER_AMOUNT,
          });
          return z.NEVER;
        }
        return undefined;
      }

      if (value < min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: min > 0 ? ENTER_AMOUNT : "Enter 0 or more",
        });
        return z.NEVER;
      }

      return value;
    });

const requiredAmount = num(0).refine(
  (value): value is number => typeof value === "number" && value > 0,
  { message: ENTER_AMOUNT },
);

const optNum = (min = 0) =>
  z
    .union([z.number().min(min), z.nan()])
    .optional()
    .transform((v) =>
      v === undefined || (typeof v === "number" && isNaN(v))
        ? undefined
        : (v as number),
    );

export const identitySchema = z
  .object({
    first_name: z.string().max(25).optional(),
    last_name: z.string().max(25).optional(),
    /** Set to first_name + last_name for solo; entered directly for partner/family */
    display_name: z.string().max(100).optional(),
    /** Only collected for solo accounts */
    date_of_birth: z.string().optional(),
    phone_number: z
      .string()
      .min(1, "Phone number is required")
      .max(255)
      .refine((value) => isValidPhoneNumber(value), {
        message: "Enter a valid phone number for the selected country code",
      }),
    resident_country: z.string().min(1, "Country is required"),
    resident_state: z.string().optional(),
    resident_city: z.string().min(1, "City is required"),
    currency: z.string().min(1, "Currency is required").max(3),
    account_mode: z.enum(["solo", "partner", "family"]),
    marital_status: z.string().optional(),
    occupation: z.string().max(50).optional(),
    prefix: z.string().optional(),
    gender: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.account_mode === "solo") {
      if (!data.first_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "First name is required",
          path: ["first_name"],
        });
      }
      if (!data.last_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Last name is required",
          path: ["last_name"],
        });
      }
      if (!data.date_of_birth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date of birth is required",
          path: ["date_of_birth"],
        });
      }
    } else {
      if (!data.display_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Household name is required",
          path: ["display_name"],
        });
      }
    }
  });

export const goalSchema = z.object({
  title: z.string().min(1, "Goal title is required"),
  target_amount: requiredAmount,
  target_date: z.string().min(1, "Target date is required"),
});

export const incomeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  amount_monthly: requiredAmount,
  category: z.string().min(1, "Category is required").max(50),
  is_recurring: z.boolean(),
});

export const liabilitySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  liability_type: z.string().min(1, "Type is required").max(30),
  balance: num(0),
  interest_rate_pct: num(0),
  minimum_payment_monthly: num(0),
  due_date: z.string().optional(),
});

export const expenseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  amount_monthly: requiredAmount,
  category: z.string().min(1, "Category is required").max(50),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const emergencyFundSchema = z.object({
  cash_balance: num(0),
  storage_location: z.string().optional(),
});

export const retirementSchema = z
  .object({
    /**
     * Only used for solo accounts. Omit for partner/family.
     * retirement_target_year is derived from DOB + retirement_age for solo.
     */
    retirement_age: optNum(18),
    /**
     * Source of truth for all account types.
     * For solo: derived on submit (DOB year + retirement_age).
     * For partner/family: entered directly.
     */
    retirement_target_year: optNum(new Date().getFullYear()),
    monthly_savings: num(0),
    desired_monthly_income: num(0),
    storage_location: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasAge =
      typeof data.retirement_age === "number" &&
      !Number.isNaN(data.retirement_age);
    const hasYear =
      typeof data.retirement_target_year === "number" &&
      !Number.isNaN(data.retirement_target_year);
    if (!hasAge && !hasYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a target so we can build your plan",
        path: ["retirement_age"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a target so we can build your plan",
        path: ["retirement_target_year"],
      });
    }
  });

export type IdentityFormValues = z.infer<typeof identitySchema>;
export type GoalFormValues = z.infer<typeof goalSchema>;
export type IncomeFormValues = z.infer<typeof incomeSchema>;
export type LiabilityFormValues = z.infer<typeof liabilitySchema>;
export type EmergencyFundFormValues = z.infer<typeof emergencyFundSchema>;
export type RetirementFormValues = z.infer<typeof retirementSchema>;
