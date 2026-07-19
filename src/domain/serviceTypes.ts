import { z } from 'zod';

export type InputType = 'text' | 'number' | 'select' | 'date';

export interface FieldConfig {
  key: string;
  label: string;
  input: InputType;
  unit?: string;
  options?: string[];
  required?: boolean;
}

export interface ServiceTypeConfig<T extends z.ZodTypeAny = z.ZodTypeAny> {
  key: string;
  label: string;
  detailsSchema: T;
  fields: FieldConfig[];
}

const oilChangeDetailsSchema = z.object({
  oilViscosity: z.enum(['0W-20', '5W-20', '5W-30', '10W-30', 'other']),
  oilType: z.enum(['conventional', 'synthetic blend', 'full synthetic', 'other']),
  quantityQts: z.number(),
  oilFilterPartNumber: z.string(),
});

const oilChange: ServiceTypeConfig<typeof oilChangeDetailsSchema> = {
  key: 'oil_change',
  label: 'Oil Change',
  detailsSchema: oilChangeDetailsSchema,
  fields: [
    {
      key: 'oilViscosity',
      label: 'Oil Viscosity',
      input: 'select',
      options: ['0W-20', '5W-20', '5W-30', '10W-30', 'other'],
      required: true,
    },
    {
      key: 'oilType',
      label: 'Oil Type',
      input: 'select',
      options: ['conventional', 'synthetic blend', 'full synthetic', 'other'],
      required: true,
    },
    {
      key: 'quantityQts',
      label: 'Quantity',
      input: 'number',
      unit: 'qts',
      required: true,
    },
    {
      key: 'oilFilterPartNumber',
      label: 'Oil Filter Part Number',
      input: 'text',
      required: true,
    },
  ],
};

const tireRotationDetailsSchema = z.object({});

const tireRotation: ServiceTypeConfig<typeof tireRotationDetailsSchema> = {
  key: 'tire_rotation',
  label: 'Tire Rotation',
  detailsSchema: tireRotationDetailsSchema,
  fields: [],
};

export const serviceTypes = {
  oil_change: oilChange,
  tire_rotation: tireRotation,
} as const satisfies Record<string, ServiceTypeConfig>;

export type ServiceTypeKey = keyof typeof serviceTypes;

// Discriminated union of { type, details }, derived from the seed configs' schemas — never hand-written.
export type ServiceDetails = {
  [K in ServiceTypeKey]: {
    type: K;
    details: z.infer<(typeof serviceTypes)[K]['detailsSchema']>;
  };
}[ServiceTypeKey];
