export const SUPPORTED_DEPARTMENTS = ["AE","ME","CS","EE"] as const;

export type SupportedDepartment = (typeof SUPPORTED_DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<string, { labelKo: string; labelShort: string }> = {
  "AE": {
    "labelKo": "항공우주공학과",
    "labelShort": "AE"
  },
  "ME": {
    "labelKo": "기계공학과",
    "labelShort": "ME"
  },
  "CS": {
    "labelKo": "전산학부",
    "labelShort": "CS"
  },
  "EE": {
    "labelKo": "전기및전자공학부",
    "labelShort": "EE"
  }
};
