export type ReferenceRange = {
  unit?: string;
  min?: number;
  max?: number;
  typical?: string;
};

export const REFERENCE_RANGES: Record<string, ReferenceRange> = {
  age: {},
  bp: { min: 60, max: 80, unit: "mmHg" },
  sg: { min: 1.005, max: 1.025 },
  al: { typical: "none" },
  su: { typical: "none" },
  bgr: { min: 70, max: 140, unit: "mg/dL" },
  bu: { min: 7, max: 20, unit: "mg/dL" },
  sc: { min: 0.6, max: 1.3, unit: "mg/dL" },
  sod: { min: 135, max: 145, unit: "mEq/L" },
  pot: { min: 3.5, max: 5, unit: "mEq/L" },
  hemo: { min: 12, max: 17.5, unit: "g/dL" },
  pcv: { min: 36, max: 50, unit: "%" },
  wbcc: { min: 4500, max: 11000, unit: "cells/cumm" },
  rbcc: { min: 4.2, max: 6.1, unit: "million/cmm" },
  rbc: { typical: "normal" },
  pc: { typical: "normal" },
  pcc: { typical: "notpresent" },
  ba: { typical: "notpresent" },
  htn: { typical: "no" },
  dm: { typical: "no" },
  cad: { typical: "no" },
  appet: { typical: "good" },
  pe: { typical: "no" },
  ane: { typical: "no" },
};
