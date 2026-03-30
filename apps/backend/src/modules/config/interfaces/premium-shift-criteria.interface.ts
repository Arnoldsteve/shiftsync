export interface PremiumShiftCriteriaData {
  criteriaType: 'DAY_OF_WEEK' | 'TIME_OF_DAY' | 'HOLIDAY';
  criteriaValue: string; // JSON string
}
