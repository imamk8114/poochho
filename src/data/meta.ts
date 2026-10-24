export interface District {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Relative population weight, so busy districts generate more complaints. */
  weight: number;
  /** Other names a person might type or say, in English, Hindi and Kannada. */
  aliases: string[];
}

// Approximate district headquarters coordinates. The complaint data itself is synthetic.
export const DISTRICTS: District[] = [
  { id: 'bengaluru-urban', name: 'Bengaluru Urban', lat: 12.97, lon: 77.59, weight: 22, aliases: ['bengaluru', 'bangalore', 'बेंगलुरु', 'बैंगलोर', 'बेंगलूरु', 'ಬೆಂಗಳೂರು'] },
  { id: 'bengaluru-rural', name: 'Bengaluru Rural', lat: 13.2, lon: 77.4, weight: 3, aliases: ['bengaluru rural', 'bangalore rural', 'बेंगलुरु ग्रामीण', 'ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ'] },
  { id: 'mysuru', name: 'Mysuru', lat: 12.3, lon: 76.64, weight: 6, aliases: ['mysuru', 'mysore', 'मैसूर', 'मैसूरु', 'ಮೈಸೂರು'] },
  { id: 'belagavi', name: 'Belagavi', lat: 15.85, lon: 74.5, weight: 6, aliases: ['belagavi', 'belgaum', 'बेलगावी', 'बेलगाम', 'ಬೆಳಗಾವಿ'] },
  { id: 'kalaburagi', name: 'Kalaburagi', lat: 17.33, lon: 76.83, weight: 4.5, aliases: ['kalaburagi', 'gulbarga', 'कलबुर्गी', 'गुलबर्गा', 'ಕಲಬುರಗಿ'] },
  { id: 'dakshina-kannada', name: 'Dakshina Kannada', lat: 12.91, lon: 74.86, weight: 5, aliases: ['dakshina kannada', 'mangaluru', 'mangalore', 'मंगलुरु', 'मैंगलोर', 'ಮಂಗಳೂರು'] },
  { id: 'dharwad', name: 'Dharwad', lat: 15.36, lon: 75.12, weight: 5, aliases: ['dharwad', 'hubballi', 'hubli', 'धारवाड़', 'हुबली', 'ಧಾರವಾಡ', 'ಹುಬ್ಬಳ್ಳಿ'] },
  { id: 'ballari', name: 'Ballari', lat: 15.14, lon: 76.92, weight: 4, aliases: ['ballari', 'bellary', 'बेल्लारी', 'बल्लारी', 'ಬಳ್ಳಾರಿ'] },
  { id: 'shivamogga', name: 'Shivamogga', lat: 13.93, lon: 75.57, weight: 3.5, aliases: ['shivamogga', 'shimoga', 'शिवमोग्गा', 'शिमोगा', 'ಶಿವಮೊಗ್ಗ'] },
  { id: 'tumakuru', name: 'Tumakuru', lat: 13.34, lon: 77.1, weight: 4.5, aliases: ['tumakuru', 'tumkur', 'तुमकुरु', 'तुमकूर', 'ತುಮಕೂರು'] },
  { id: 'davanagere', name: 'Davanagere', lat: 14.47, lon: 75.92, weight: 3.5, aliases: ['davanagere', 'davangere', 'दावणगेरे', 'ದಾವಣಗೆರೆ'] },
  { id: 'vijayapura', name: 'Vijayapura', lat: 16.83, lon: 75.71, weight: 3.5, aliases: ['vijayapura', 'bijapur', 'विजयपुरा', 'बीजापुर', 'ವಿಜಯಪುರ'] },
  { id: 'udupi', name: 'Udupi', lat: 13.34, lon: 74.75, weight: 2.5, aliases: ['udupi', 'उडुपी', 'ಉಡುಪಿ'] },
  { id: 'hassan', name: 'Hassan', lat: 13.0, lon: 76.1, weight: 3, aliases: ['hassan', 'हासन', 'ಹಾಸನ'] },
  { id: 'mandya', name: 'Mandya', lat: 12.52, lon: 76.9, weight: 3, aliases: ['mandya', 'मांड्या', 'ಮಂಡ್ಯ'] },
  { id: 'raichur', name: 'Raichur', lat: 16.21, lon: 77.36, weight: 3, aliases: ['raichur', 'रायचूर', 'ರಾಯಚೂರು'] },
  { id: 'bidar', name: 'Bidar', lat: 17.91, lon: 77.52, weight: 2.5, aliases: ['bidar', 'बीदर', 'ಬೀದರ್'] },
  { id: 'chitradurga', name: 'Chitradurga', lat: 14.23, lon: 76.4, weight: 2.5, aliases: ['chitradurga', 'चित्रदुर्ग', 'ಚಿತ್ರದುರ್ಗ'] },
  { id: 'kolar', name: 'Kolar', lat: 13.14, lon: 78.13, weight: 3, aliases: ['kolar', 'कोलार', 'ಕೋಲಾರ'] },
  { id: 'chikkamagaluru', name: 'Chikkamagaluru', lat: 13.32, lon: 75.77, weight: 2, aliases: ['chikkamagaluru', 'chikmagalur', 'चिकमगलुरु', 'ಚಿಕ್ಕಮಗಳೂರು'] },
  { id: 'koppal', name: 'Koppal', lat: 15.35, lon: 76.15, weight: 2, aliases: ['koppal', 'कोप्पल', 'ಕೊಪ್ಪಳ'] },
  { id: 'gadag', name: 'Gadag', lat: 15.43, lon: 75.63, weight: 2, aliases: ['gadag', 'गदग', 'ಗದಗ'] },
  { id: 'haveri', name: 'Haveri', lat: 14.79, lon: 75.4, weight: 2, aliases: ['haveri', 'हावेरी', 'ಹಾವೇರಿ'] },
  { id: 'bagalkot', name: 'Bagalkot', lat: 16.18, lon: 75.7, weight: 3, aliases: ['bagalkot', 'बागलकोट', 'ಬಾಗಲಕೋಟೆ'] },
  { id: 'yadgir', name: 'Yadgir', lat: 16.77, lon: 77.14, weight: 1.8, aliases: ['yadgir', 'यादगीर', 'ಯಾದಗಿರಿ'] },
  { id: 'chamarajanagar', name: 'Chamarajanagar', lat: 11.93, lon: 76.94, weight: 1.6, aliases: ['chamarajanagar', 'चामराजनगर', 'ಚಾಮರಾಜನಗರ'] },
  { id: 'kodagu', name: 'Kodagu', lat: 12.42, lon: 75.74, weight: 1.5, aliases: ['kodagu', 'coorg', 'कोडागु', 'कूर्ग', 'ಕೊಡಗು'] },
  { id: 'ramanagara', name: 'Ramanagara', lat: 12.72, lon: 77.28, weight: 2.2, aliases: ['ramanagara', 'रामनगर', 'ರಾಮನಗರ'] },
  { id: 'chikkaballapur', name: 'Chikkaballapur', lat: 13.43, lon: 77.73, weight: 2, aliases: ['chikkaballapur', 'चिक्काबल्लापुर', 'ಚಿಕ್ಕಬಳ್ಳಾಪುರ'] },
  { id: 'uttara-kannada', name: 'Uttara Kannada', lat: 14.8, lon: 74.13, weight: 2.5, aliases: ['uttara kannada', 'karwar', 'उत्तर कन्नड़', 'ಉತ್ತರ ಕನ್ನಡ'] },
];

export interface Category {
  id: string;
  name: string;
  /** Typical days to resolve one complaint. */
  baseDays: number;
  aliases: string[];
}

export const CATEGORIES: Category[] = [
  { id: 'water', name: 'Water supply', baseDays: 4, aliases: ['water', 'paani', 'pani', 'पानी', 'जल', 'पेयजल', 'ನೀರು'] },
  { id: 'roads', name: 'Roads and potholes', baseDays: 12, aliases: ['roads', 'road', 'pothole', 'potholes', 'sadak', 'sadkein', 'सड़क', 'सड़कें', 'गड्ढे', 'गड्ढा', 'ರಸ್ತೆ', 'ರಸ್ತೆಗಳು'] },
  { id: 'electricity', name: 'Electricity', baseDays: 2, aliases: ['electricity', 'power', 'bijli', 'बिजली', 'ವಿದ್ಯುತ್', 'ಕರೆಂಟ್'] },
  { id: 'garbage', name: 'Garbage and sanitation', baseDays: 3, aliases: ['garbage', 'waste', 'sanitation', 'kachra', 'kooda', 'कचरा', 'कूड़ा', 'सफाई', 'ಕಸ'] },
  { id: 'street-lights', name: 'Street lights', baseDays: 6, aliases: ['street lights', 'street light', 'streetlights', 'streetlight', 'lights', 'light', 'batti', 'स्ट्रीट लाइट', 'बत्ती', 'लाइट', 'ಬೀದಿ ದೀಪ'] },
  { id: 'transport', name: 'Public transport', baseDays: 9, aliases: ['transport', 'bus', 'buses', 'बस', 'परिवहन', 'ಬಸ್', 'ಸಾರಿಗೆ'] },
];

export const STATUSES = [
  { id: 'resolved', name: 'Resolved' },
  { id: 'in-progress', name: 'In progress' },
  { id: 'open', name: 'Open' },
] as const;

export const START = { year: 2025, month: 1 };
export const MONTH_COUNT = 18; // Jan 2025 to Jun 2026
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2025-03" for month index 2. */
export function monthKey(index: number): string {
  const total = START.year * 12 + (START.month - 1) + index;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export function monthLabel(index: number): string {
  const total = START.year * 12 + (START.month - 1) + index;
  return `${MONTH_NAMES[total % 12]} ${Math.floor(total / 12)}`;
}

/** Index of a "YYYY-MM" key in the dataset, or null when it is outside the data. */
export function monthIndex(key: string): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const index = (Number(m[1]) - START.year) * 12 + (Number(m[2]) - START.month);
  return index >= 0 && index < MONTH_COUNT ? index : null;
}

export const FIRST_MONTH = monthKey(0);
export const LAST_MONTH = monthKey(MONTH_COUNT - 1);

export const DATASET_SIZE = 24000;
