import { z } from 'zod';

export type InputType = 'text' | 'number' | 'select' | 'date';

export interface FieldConfig {
  key: string;
  label: string;
  input: InputType;
  unit?: string;
  options?: readonly string[];
  required?: boolean;
}

/** A `FieldConfig` that also carries the Zod schema for its own value. */
export interface Field<K extends string = string, S extends z.ZodTypeAny = z.ZodTypeAny> extends FieldConfig {
  key: K;
  schema: S;
}

export interface ServiceTypeConfig<T extends z.ZodTypeAny = z.ZodTypeAny> {
  key: string;
  label: string;
  detailsSchema: T;
  fields: readonly FieldConfig[];
  // When true, this type's badge renders in the accent color instead of the
  // subtle surface fill — purely presentational, drives the `.badge--accent` class.
  accentBadge?: boolean;
}

// ---------------------------------------------------------------------------
// Field builders — each field declares its own schema so `fields` is the single
// source of truth and the details schema is derived from it (see schemaFromFields).
// ---------------------------------------------------------------------------

interface FieldOptions<R extends boolean> {
  unit?: string;
  required?: R;
}

/** `required: true` keeps the schema as-is; anything else makes it optional. */
type Maybe<S extends z.ZodTypeAny, R extends boolean> = R extends true ? S : z.ZodOptional<S>;

function applyRequired<S extends z.ZodTypeAny, R extends boolean>(schema: S, required: R | undefined): Maybe<S, R> {
  return (required === true ? schema : schema.optional()) as Maybe<S, R>;
}

export function textField<const K extends string, R extends boolean = false>(
  key: K,
  label: string,
  options: FieldOptions<R> = {},
): Field<K, Maybe<z.ZodString, R>> {
  return {
    key,
    label,
    input: 'text',
    unit: options.unit,
    required: options.required,
    schema: applyRequired(z.string(), options.required),
  };
}

export function numberField<const K extends string, R extends boolean = false>(
  key: K,
  label: string,
  options: FieldOptions<R> = {},
): Field<K, Maybe<z.ZodNumber, R>> {
  return {
    key,
    label,
    input: 'number',
    unit: options.unit,
    required: options.required,
    schema: applyRequired(z.number(), options.required),
  };
}

export function dateField<const K extends string, R extends boolean = false>(
  key: K,
  label: string,
  options: FieldOptions<R> = {},
): Field<K, Maybe<z.ZodString, R>> {
  return {
    key,
    label,
    input: 'date',
    unit: options.unit,
    required: options.required,
    schema: applyRequired(z.string(), options.required),
  };
}

export function selectField<const K extends string, const O extends readonly [string, ...string[]], R extends boolean = false>(
  key: K,
  label: string,
  choices: O,
  options: FieldOptions<R> = {},
): Field<K, Maybe<z.ZodEnum<{ [V in O[number]]: V }>, R>> {
  return {
    key,
    label,
    input: 'select',
    options: choices,
    unit: options.unit,
    required: options.required,
    schema: applyRequired(z.enum(choices as unknown as O[number][]), options.required) as Maybe<
      z.ZodEnum<{ [V in O[number]]: V }>,
      R
    >,
  };
}

type FieldsShape<F extends readonly Field[]> = { [K in F[number] as K['key']]: K['schema'] };

/** Assembles a details schema from the fields' own schemas — never hand-written alongside them. */
export function schemaFromFields<const F extends readonly Field[]>(fields: F): z.ZodObject<FieldsShape<F>> {
  // The cast bridges z.object's `-readonly` shape mapping, which TS can't prove
  // equivalent to FieldsShape<F> while F is still generic.
  return z.object(Object.fromEntries(fields.map((f) => [f.key, f.schema]))) as unknown as z.ZodObject<FieldsShape<F>>;
}

// ---------------------------------------------------------------------------
// Built-in types
// ---------------------------------------------------------------------------

const oilChangeFields = [
  selectField('oilViscosity', 'Oil Viscosity', ['0W-20', '5W-20', '5W-30', '10W-30', 'other'], { required: true }),
  selectField('oilType', 'Oil Type', ['conventional', 'synthetic blend', 'full synthetic', 'other'], {
    required: true,
  }),
  numberField('quantityQts', 'Quantity', { unit: 'qts', required: true }),
  textField('oilFilterPartNumber', 'Oil Filter Part Number', { required: true }),
] as const;

const oilChangeDetailsSchema = schemaFromFields(oilChangeFields);

const oilChange: ServiceTypeConfig<typeof oilChangeDetailsSchema> = {
  key: 'oil_change',
  label: 'Oil Change',
  detailsSchema: oilChangeDetailsSchema,
  accentBadge: true,
  fields: oilChangeFields,
};

const emptyDetailsSchema = z.object({});

const tireRotation: ServiceTypeConfig<typeof emptyDetailsSchema> = {
  key: 'tire_rotation',
  label: 'Tire Rotation',
  detailsSchema: emptyDetailsSchema,
  fields: [],
};

export const serviceTypes = {
  oil_change: oilChange,
  tire_rotation: tireRotation,
} as const satisfies Record<string, ServiceTypeConfig>;

export type BuiltInServiceTypeKey = keyof typeof serviceTypes;

// Discriminated union of { type, details }, derived from the built-in configs' schemas — never hand-written.
type BuiltInDetails = {
  [K in BuiltInServiceTypeKey]: {
    type: K;
    details: z.infer<(typeof serviceTypes)[K]['detailsSchema']>;
  };
}[BuiltInServiceTypeKey];

/**
 * A user-typed service type. Carries no per-type fields — `notes` is the escape
 * hatch. Widening `type` to `string` means TypeScript can no longer reject a
 * built-in key paired with empty details; the repository's Zod check is the
 * guarantee that `details` matches its type.
 */
type CustomDetails = { type: string; details: Record<string, never> };

export type ServiceDetails = BuiltInDetails | CustomDetails;

// ---------------------------------------------------------------------------
// Accessors — views and repositories go through these, never index `serviceTypes`
// directly, so an unrecognized (i.e. custom) type can never blow up a lookup.
// ---------------------------------------------------------------------------

export function isBuiltIn(type: string): type is BuiltInServiceTypeKey {
  return Object.hasOwn(serviceTypes, type);
}

// Synthesized configs are cached so repeated lookups keep object identity stable
// (Vue computeds and v-for keys depend on it).
const customConfigs = new Map<string, ServiceTypeConfig>();

/** Config for any type. A custom label gets a synthesized fields-free config. */
export function getServiceType(type: string): ServiceTypeConfig {
  if (isBuiltIn(type)) return serviceTypes[type];
  let config = customConfigs.get(type);
  if (!config) {
    config = { key: type, label: type, detailsSchema: emptyDetailsSchema, fields: [] };
    customConfigs.set(type, config);
  }
  return config;
}

/** The built-in's `label`, or the custom type's own string. */
export function serviceTypeLabel(type: string): string {
  return getServiceType(type).label;
}

export function badgeClass(type: string): string {
  return getServiceType(type).accentBadge ? 'badge badge--accent' : 'badge';
}

/** Distinct types present in a record set: built-ins in registry order, then custom labels A–Z. */
export function distinctTypes(records: readonly { type: string }[]): string[] {
  const present = new Set(records.map((r) => r.type));
  const builtIns = Object.keys(serviceTypes).filter((key) => present.has(key));
  const custom = [...present].filter((type) => !isBuiltIn(type)).sort((a, b) => a.localeCompare(b));
  return [...builtIns, ...custom];
}

/** Trims and collapses internal whitespace so " Brake  Pads " and "Brake Pads" are one type. */
export function normalizeServiceType(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/** Returns an error message for an unusable service type, or null when it's valid. */
export function validateServiceType(input: string): string | null {
  const type = normalizeServiceType(input);
  if (!type) return 'Service type is required.';
  if (isBuiltIn(type)) return null;

  const folded = type.toLowerCase();
  const clash = Object.values(serviceTypes).find(
    (config) => config.key.toLowerCase() === folded || config.label.toLowerCase() === folded,
  );
  if (clash) return `“${type}” is the built-in ${clash.label} type — pick it from the type buttons instead.`;

  return null;
}
