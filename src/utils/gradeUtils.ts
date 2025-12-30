// Boulder color definitions with Sharma gym colors
export const BOULDER_COLORS = ['white', 'blue', 'green', 'yellow', 'red', 'purple', 'black'] as const;
export type BoulderColor = typeof BOULDER_COLORS[number];

// Boulder color to index mapping (1-7)
export const boulderColorToIndex = (color: BoulderColor | string | null): number => {
  const colorLower = color?.toLowerCase() || '';
  const index = BOULDER_COLORS.indexOf(colorLower as BoulderColor);
  return index >= 0 ? index + 1 : 0;
};

export const indexToBoulderColor = (index: number): BoulderColor | null => {
  if (index < 1 || index > 7) return null;
  return BOULDER_COLORS[index - 1];
};

// Boulder color to French range equivalence (approximate)
export const BOULDER_TO_FRENCH_RANGE: Record<BoulderColor, string> = {
  white: '4c–5b',
  blue: '5b–5c+',
  green: '5c–6a+',
  yellow: '6a–6b',
  red: '6b–6c',
  purple: '6c–7a',
  black: '7a–7b+',
};

export const getBoulderDisplayLabel = (color: BoulderColor | string | null): string => {
  if (!color) return 'Unknown';
  const colorLower = color.toLowerCase() as BoulderColor;
  const range = BOULDER_TO_FRENCH_RANGE[colorLower];
  const colorCapitalized = color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  return range ? `${colorCapitalized} (≈ ${range})` : colorCapitalized;
};

// French grade system
const FRENCH_GRADES = [
  '4a', '4a+', '4b', '4b+', '4c', '4c+',
  '5a', '5a+', '5b', '5b+', '5c', '5c+',
  '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c', '8c+',
  '9a', '9a+', '9b', '9b+', '9c',
];

export const frenchGradeToIndex = (grade: string | null): number => {
  if (!grade) return 0;
  const gradeLower = grade.toLowerCase().trim();
  const index = FRENCH_GRADES.indexOf(gradeLower);
  return index >= 0 ? index + 1 : 0;
};

export const indexToFrenchGrade = (index: number): string | null => {
  if (index < 1 || index > FRENCH_GRADES.length) return null;
  return FRENCH_GRADES[index - 1];
};

// V-grade to French equivalence
const V_TO_FRENCH: Record<string, string> = {
  'V0': '4c',
  'V1': '5a',
  'V2': '5b',
  'V3': '5c',
  'V4': '6a+',
  'V5': '6b+',
  'V6': '6c',
  'V7': '7a',
  'V8': '7a+',
  'V9': '7b',
  'V10': '7b+',
  'V11': '7c',
  'V12': '7c+',
  'V13': '8a',
  'V14': '8a+',
  'V15': '8b',
  'V16': '8b+',
};

export const vGradeToFrenchIndex = (vGrade: string): number => {
  const french = V_TO_FRENCH[vGrade.toUpperCase()];
  return french ? frenchGradeToIndex(french) : 0;
};

// Generic grade to index based on grade system
export const gradeToIndex = (
  gradeValue: string | null, 
  gradeSystem: string | null,
  colorBand?: string | null
): number => {
  if (!gradeValue && !colorBand) return 0;
  
  // For boulder with color band, use color index
  if (colorBand) {
    return boulderColorToIndex(colorBand);
  }
  
  switch (gradeSystem?.toLowerCase()) {
    case 'french':
      return frenchGradeToIndex(gradeValue);
    case 'v-grade':
      return vGradeToFrenchIndex(gradeValue || '');
    case 'font':
      return frenchGradeToIndex(gradeValue);
    case 'yds':
      // YDS approximate conversion (simplified)
      const ydsNum = parseInt(gradeValue?.replace(/[^\d]/g, '') || '0');
      return Math.max(0, ydsNum - 8);
    default:
      return frenchGradeToIndex(gradeValue);
  }
};

// Color styling for boulder colors
export const BOULDER_COLOR_STYLES: Record<BoulderColor, { bg: string; text: string; border: string }> = {
  white: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  blue: { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
  green: { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' },
  yellow: { bg: 'bg-yellow-400', text: 'text-yellow-900', border: 'border-yellow-500' },
  red: { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' },
  purple: { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-600' },
  black: { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-800' },
};

export const getBoulderColorStyle = (color: string | null) => {
  if (!color) return BOULDER_COLOR_STYLES.white;
  return BOULDER_COLOR_STYLES[color.toLowerCase() as BoulderColor] || BOULDER_COLOR_STYLES.white;
};
