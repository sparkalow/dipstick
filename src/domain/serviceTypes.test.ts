import { describe, expect, it } from 'vitest';
import { serviceTypes } from './serviceTypes';

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
