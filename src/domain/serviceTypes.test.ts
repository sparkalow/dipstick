import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  badgeClass,
  distinctTypes,
  getServiceType,
  isBuiltIn,
  normalizeServiceType,
  numberField,
  schemaFromFields,
  selectField,
  serviceTypeLabel,
  serviceTypes,
  textField,
  validateServiceType,
} from './serviceTypes';

describe('oil_change detailsSchema', () => {
  const schema = serviceTypes.oil_change.detailsSchema;

  it('parse_validDetails_accepts', () => {
    const valid = {
      oilViscosity: '5W-30',
      oilType: 'full synthetic',
      quantityQts: 5,
      oilFilterPartNumber: 'PH1234',
    };
    expect(schema.parse(valid)).toEqual(valid);
  });

  it('parse_otherEnumOptions_accepts', () => {
    const valid = {
      oilViscosity: 'other',
      oilType: 'other',
      quantityQts: 4.5,
      oilFilterPartNumber: 'N/A',
    };
    expect(() => schema.parse(valid)).not.toThrow();
  });

  it('parse_invalidViscosityEnum_rejects', () => {
    const invalid = {
      oilViscosity: '15W-40',
      oilType: 'conventional',
      quantityQts: 5,
      oilFilterPartNumber: 'PH1234',
    };
    expect(() => schema.parse(invalid)).toThrow();
  });

  it('parse_invalidOilTypeEnum_rejects', () => {
    const invalid = {
      oilViscosity: '5W-30',
      oilType: 'used',
      quantityQts: 5,
      oilFilterPartNumber: 'PH1234',
    };
    expect(() => schema.parse(invalid)).toThrow();
  });

  it('parse_missingRequiredField_rejects', () => {
    const invalid = {
      oilViscosity: '5W-30',
      oilType: 'conventional',
      quantityQts: 5,
    };
    expect(() => schema.parse(invalid)).toThrow();
  });

  it('parse_wrongTypeForQuantity_rejects', () => {
    const invalid = {
      oilViscosity: '5W-30',
      oilType: 'conventional',
      quantityQts: '5',
      oilFilterPartNumber: 'PH1234',
    };
    expect(() => schema.parse(invalid)).toThrow();
  });
});

describe('tire_rotation detailsSchema', () => {
  const schema = serviceTypes.tire_rotation.detailsSchema;

  it('parse_emptyObject_accepts', () => {
    expect(schema.parse({})).toEqual({});
  });

  it('parse_nonObjectInput_rejects', () => {
    expect(() => schema.parse([])).toThrow();
    expect(() => schema.parse('tire_rotation')).toThrow();
    expect(() => schema.parse(null)).toThrow();
  });

  it('fields_emptyArray_matchesReferenceCase', () => {
    expect(serviceTypes.tire_rotation.fields).toEqual([]);
  });
});

describe('schemaFromFields', () => {
  const fields = [
    selectField('grade', 'Grade', ['low', 'high'], { required: true }),
    numberField('qty', 'Quantity', { required: true }),
    textField('note', 'Note'),
  ] as const;
  const schema = schemaFromFields(fields);

  it('parse_valueOutsideSelectOptions_rejects', () => {
    expect(schema.safeParse({ grade: 'medium', qty: 1 }).success).toBe(false);
  });

  it('parse_stringForNumberField_rejects', () => {
    expect(schema.safeParse({ grade: 'low', qty: '1' }).success).toBe(false);
  });

  it('parse_omittedOptionalField_accepts', () => {
    expect(schema.parse({ grade: 'low', qty: 1 })).toEqual({ grade: 'low', qty: 1 });
  });

  it('parse_omittedRequiredField_rejects', () => {
    expect(schema.safeParse({ grade: 'low' }).success).toBe(false);
  });

  it('infer_derivedSchema_preservesLiteralEnumOptions', () => {
    type OilDetails = z.infer<typeof serviceTypes.oil_change.detailsSchema>;
    const valid: OilDetails = {
      oilViscosity: '5W-30',
      oilType: 'full synthetic',
      quantityQts: 5,
      oilFilterPartNumber: 'PH1234',
    };
    // @ts-expect-error deriving the schema from `fields` must keep the literal option
    // union rather than widening it to `string` — this line failing to error is the bug.
    const widened: OilDetails = { ...valid, oilViscosity: '15W-40' };

    expect(serviceTypes.oil_change.detailsSchema.safeParse(valid).success).toBe(true);
    expect(serviceTypes.oil_change.detailsSchema.safeParse(widened).success).toBe(false);
  });
});

describe('service type accessors', () => {
  it('isBuiltIn_customLabel_returnsFalse', () => {
    expect(isBuiltIn('oil_change')).toBe(true);
    expect(isBuiltIn('Brake Pads')).toBe(false);
  });

  it('getServiceType_builtInKey_returnsRegistryConfig', () => {
    expect(getServiceType('oil_change')).toBe(serviceTypes.oil_change);
  });

  it('getServiceType_customLabel_returnsFieldlessConfigLabelledWithTheInput', () => {
    const config = getServiceType('Brake Pads');

    expect(config.label).toBe('Brake Pads');
    expect(config.fields).toEqual([]);
    expect(config.detailsSchema.parse({})).toEqual({});
  });

  it('getServiceType_sameCustomLabelTwice_returnsIdenticalObject', () => {
    // Vue computeds and v-for keys rely on the identity staying stable.
    expect(getServiceType('Coolant Flush')).toBe(getServiceType('Coolant Flush'));
  });

  it('serviceTypeLabel_customLabel_returnsInputVerbatim', () => {
    expect(serviceTypeLabel('oil_change')).toBe('Oil Change');
    expect(serviceTypeLabel('Brake Pads')).toBe('Brake Pads');
  });

  it('badgeClass_customLabel_usesTheDefaultBadge', () => {
    expect(badgeClass('oil_change')).toBe('badge badge--accent');
    expect(badgeClass('tire_rotation')).toBe('badge');
    expect(badgeClass('Brake Pads')).toBe('badge');
  });
});

describe('distinctTypes', () => {
  it('distinctTypes_mixedRecords_dedupesAndPutsBuiltInsBeforeCustomAlpha', () => {
    const records = [
      { type: 'Wipers' },
      { type: 'tire_rotation' },
      { type: 'Brake Pads' },
      { type: 'oil_change' },
      { type: 'Brake Pads' },
    ];

    expect(distinctTypes(records)).toEqual(['oil_change', 'tire_rotation', 'Brake Pads', 'Wipers']);
  });

  it('distinctTypes_typeAbsentFromRecords_isOmitted', () => {
    expect(distinctTypes([{ type: 'oil_change' }])).toEqual(['oil_change']);
  });
});

describe('normalizeServiceType', () => {
  it('normalizeServiceType_paddedAndDoubleSpaced_collapsesToOneForm', () => {
    expect(normalizeServiceType('  Brake   Pads ')).toBe('Brake Pads');
  });
});

describe('validateServiceType', () => {
  it('validateServiceType_customLabel_returnsNull', () => {
    expect(validateServiceType('Brake Pads')).toBeNull();
  });

  it('validateServiceType_builtInKey_returnsNull', () => {
    expect(validateServiceType('oil_change')).toBeNull();
  });

  it('validateServiceType_blankOrWhitespace_returnsError', () => {
    expect(validateServiceType('')).toMatch(/required/i);
    expect(validateServiceType('   ')).toMatch(/required/i);
  });

  it('validateServiceType_builtInLabelInAnyCase_returnsError', () => {
    // Would otherwise create a custom type that renders identically to the built-in.
    expect(validateServiceType('Oil Change')).toMatch(/built-in/i);
    expect(validateServiceType('oil change')).toMatch(/built-in/i);
    expect(validateServiceType('OIL_CHANGE')).toMatch(/built-in/i);
  });
});
