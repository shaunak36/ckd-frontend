export const QUICK_SPECIFIC_GRAVITY_OPTIONS = [
  { value: "1.005", label: "1.005" },
  { value: "1.010", label: "1.010" },
  { value: "1.015", label: "1.015" },
  { value: "1.020", label: "1.020" },
  { value: "1.025", label: "1.025" },
] as const;

export const QUICK_ALBUMIN_OPTIONS = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
] as const;

export const QUICK_HYPERTENSION_OPTIONS = [
  { value: "no", label: "no" },
  { value: "yes", label: "yes" },
] as const;

export const QUICK_PREDICTION_FIELDS = ["sg", "al", "htn", "sc", "bu", "hemo", "rbcc", "bgr"] as const;
export const QUICK_NUMERIC_FIELDS = ["sg", "al", "sc", "bu", "hemo", "rbcc", "bgr"] as const;

export type QuickPredictionField = (typeof QUICK_PREDICTION_FIELDS)[number];
