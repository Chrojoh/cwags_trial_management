// C-WAGS Validation Schemas
// Step 7: Zod schemas for form validation and data integrity

import { z } from 'zod';

// =============================================================================
// BASIC VALIDATION SCHEMAS
// =============================================================================

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required');

export const phoneSchema = z
  .string()
  .max(50, 'Phone number too long')
  .optional()
  .or(z.literal(''));

export const cwagsNumberSchema = z
  .string()
  .regex(/^[0-9]{2}-[0-9]{4}-[0-9]{2}$/, 'Invalid C-WAGS number format (xx-xxxx-xx)');

export const currencySchema = z
  .number()
  .min(0, 'Amount must be positive')
  .max(9999.99, 'Amount too large');

export const positiveIntegerSchema = z
  .number()
  .int('Must be a whole number')
  .min(0, 'Must be positive');

// =============================================================================
// USER SCHEMAS
// =============================================================================

export const userCreateSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(100, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email too long'),
  
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name too long'),
  
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name too long'),
  
  role: z
    .string()
    .min(1, 'Role is required')
    .max(50, 'Role too long'),
  
  club_name: z
    .string()
    .max(255, 'Club name too long')
    .optional()
    .or(z.literal('')),
  
  phone: phoneSchema,
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
});

export const userUpdateSchema = userCreateSchema.partial().omit({ password: true });

export const userLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

// =============================================================================
// JUDGE SCHEMAS
// =============================================================================

export const judgeCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name too long'),
  
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email too long'),
  
  phone: z
    .string()
    .max(200, 'Phone number too long')
    .optional()
    .or(z.literal('')),
  
  city: z
    .string()
    .max(100, 'City name too long')
    .optional()
    .or(z.literal('')),
  
  province_state: z
    .string()
    .max(100, 'Province/State name too long')
    .optional()
    .or(z.literal('')),
  
  country: z
    .string()
    .max(100, 'Country name too long')
    .optional()
    .or(z.literal('')),
  
  level: z
    .string()
    .max(500, 'Level description too long')
    .optional()
    .or(z.literal('')),
  
  is_active: z.boolean().default(true)
});

export const judgeUpdateSchema = judgeCreateSchema.partial();

export const judgeSearchSchema = z.object({
  query: z.string().optional(),
  city: z.string().optional(),
  province_state: z.string().optional(),
  country: z.string().optional(),
  level: z.string().optional(),
  is_active: z.boolean().optional()
});

// =============================================================================
// REGISTRY SCHEMAS
// =============================================================================

export const registryCreateSchema = z.object({
  cwags_number: cwagsNumberSchema,
  
  dog_call_name: z
    .string()
    .min(1, 'Dog call name is required')
    .max(100, 'Dog call name too long'),
  
  handler_name: z
    .string()
    .min(1, 'Handler name is required')
    .max(200, 'Handler name too long'),
  
  is_active: z.boolean().default(true)
});

export const registryUpdateSchema = registryCreateSchema.partial();

export const registrySearchSchema = z.object({
  query: z.string().optional(),
  is_active: z.boolean().optional()
});

// =============================================================================
// TRIAL SCHEMAS
// =============================================================================

export const trialCreateSchema = z.object({
  trial_name: z
    .string()
    .min(3, 'Trial name must be at least 3 characters')
    .max(100, 'Trial name too long'),
  
  trial_type: z
    .string()
    .min(1, 'Trial type is required'),
  
  start_date: z
    .string()
    .or(z.date())
    .transform(val => typeof val === 'string' ? new Date(val) : val),
  
  end_date: z
    .string()
    .or(z.date())
    .transform(val => typeof val === 'string' ? new Date(val) : val),
  
  location: z
    .string()
    .min(1, 'Location is required')
    .max(255, 'Location description too long'),
  
  host_club: z
    .string()
    .min(1, 'Host club is required')
    .max(200, 'Host club name too long'),
  
  trial_secretary: z
    .string()
    .min(1, 'Trial secretary is required')
    .max(200, 'Trial secretary name too long'),
  
  secretary_email: emailSchema,
  
  secretary_phone: phoneSchema,
  
  entry_deadline: z
    .string()
    .or(z.date())
    .transform(val => typeof val === 'string' ? new Date(val) : val),
  
  entry_fee: currencySchema,
  
  late_fee: currencySchema.optional(),
  
  max_entries: positiveIntegerSchema.optional()
}).refine(data => data.end_date >= data.start_date, {
  message: "End date must be after start date",
  path: ["end_date"]
}).refine(data => data.entry_deadline <= data.start_date, {
  message: "Entry deadline must be before trial start date",
  path: ["entry_deadline"]
});

export const trialUpdateSchema = trialCreateSchema.partial();

// =============================================================================
// ENTRY SCHEMAS
// =============================================================================

export const entryCreateSchema = z.object({
  trial_class_id: z.string().uuid('Invalid trial class ID'),
  
  cwags_registry_id: z.string().uuid('Invalid registry ID'),
  
  handler_name: z
    .string()
    .min(1, 'Handler name is required')
    .max(200, 'Handler name too long'),
  
  handler_email: emailSchema,
  
  handler_phone: phoneSchema,
  
  special_requests: z
    .string()
    .max(500, 'Special requests too long')
    .optional(),
  
  entry_fee: currencySchema,
  
  late_fee: currencySchema.default(0),
  
  other_fees: currencySchema.default(0)
});

export const entryUpdateSchema = entryCreateSchema.partial();

// =============================================================================
// PAGINATION SCHEMAS
// =============================================================================

export const paginationSchema = z.object({
  page: z
    .number()
    .int('Page must be a whole number')
    .min(1, 'Page must be at least 1')
    .default(1),
  
  limit: z
    .number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(25),
  
  sort: z.string().optional(),
  
  order: z.enum(['asc', 'desc']).default('asc')
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type UserCreateData = z.infer<typeof userCreateSchema>;
export type UserUpdateData = z.infer<typeof userUpdateSchema>;
export type UserLoginData = z.infer<typeof userLoginSchema>;

export type JudgeCreateData = z.infer<typeof judgeCreateSchema>;
export type JudgeUpdateData = z.infer<typeof judgeUpdateSchema>;

export type RegistryCreateData = z.infer<typeof registryCreateSchema>;
export type RegistryUpdateData = z.infer<typeof registryUpdateSchema>;

export type TrialCreateData = z.infer<typeof trialCreateSchema>;
export type TrialUpdateData = z.infer<typeof trialUpdateSchema>;

export type EntryCreateData = z.infer<typeof entryCreateSchema>;
export type EntryUpdateData = z.infer<typeof entryUpdateSchema>;

export type PaginationParams = z.infer<typeof paginationSchema>;