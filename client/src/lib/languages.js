export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'as', label: 'Assamese', nativeLabel: 'অসমীয়া' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'brx', label: 'Bodo', nativeLabel: 'बड़ो' },
  { code: 'doi', label: 'Dogri', nativeLabel: 'डोगरी' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'ks', label: 'Kashmiri', nativeLabel: 'کٲشُر / कॉशुर' },
  { code: 'kok', label: 'Konkani', nativeLabel: 'कोंकणी' },
  { code: 'mai', label: 'Maithili', nativeLabel: 'मैथिली' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'mni', label: 'Manipuri', nativeLabel: 'মৈতৈলোন् (Meitei)' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'ne', label: 'Nepali', nativeLabel: 'नेपाली' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
  { code: 'sa', label: 'Sanskrit', nativeLabel: 'संस्कृतम्' },
  { code: 'sat', label: 'Santali', nativeLabel: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'sd', label: 'Sindhi', nativeLabel: 'سنڌي / सिंधी' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو' },
];

export const normalizeLanguageCode = (code) => {
  if (!code) return 'en';
  const normalized = String(code).toLowerCase().split('-')[0];
  const supported = new Set(LANGUAGE_OPTIONS.map((l) => l.code));
  return supported.has(normalized) ? normalized : 'en';
};
