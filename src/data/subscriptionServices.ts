/**
 * Popular subscription services list for autocomplete.
 * Each entry: [name, categoryId]
 * categoryIds match SUBSCRIPTION_CATEGORIES: communication | entertainment |
 * fitness | software | education | charity | home | automotive | loyalty | other
 */

export const SUBSCRIPTION_SERVICES: [string, string][] = [
  // ─── בידור: סטרימינג וידאו ───
  ['Netflix',               'entertainment'],
  ['Disney+',               'entertainment'],
  ['Disney Plus',           'entertainment'],
  ['HBO Max',               'entertainment'],
  ['Max',                   'entertainment'],
  ['Apple TV+',             'entertainment'],
  ['Amazon Prime Video',    'entertainment'],
  ['Hulu',                  'entertainment'],
  ['Paramount+',            'entertainment'],
  ['Peacock',               'entertainment'],
  ['Discovery+',            'entertainment'],
  ['ESPN+',                 'entertainment'],
  ['Crunchyroll',           'entertainment'],
  ['MUBI',                  'entertainment'],
  ['YouTube Premium',       'entertainment'],
  ['Plex',                  'entertainment'],
  ['Hayu',                  'entertainment'],
  ['BritBox',               'entertainment'],
  ['Shudder',               'entertainment'],
  ['Curiosity Stream',      'entertainment'],
  ['HOT VOD',               'entertainment'],
  ['Yes VOD',               'entertainment'],
  ['Partner TV',            'entertainment'],
  ['Cellcom TV',            'entertainment'],
  ['Kan 11',                'entertainment'],
  ['כאן 11',               'entertainment'],
  ['HOT',                   'entertainment'],
  ['Yes',                   'entertainment'],
  ['Walla',                 'entertainment'],

  // ─── בידור: מוזיקה ───
  ['Spotify',               'entertainment'],
  ['Apple Music',           'entertainment'],
  ['YouTube Music',         'entertainment'],
  ['Amazon Music',          'entertainment'],
  ['Deezer',                'entertainment'],
  ['Tidal',                 'entertainment'],
  ['SoundCloud Go',         'entertainment'],
  ['Pandora',               'entertainment'],
  ['Anghami',               'entertainment'],

  // ─── בידור: גיימינג ───
  ['Xbox Game Pass',        'entertainment'],
  ['Xbox Game Pass Ultimate','entertainment'],
  ['PlayStation Plus',      'entertainment'],
  ['PS Plus',               'entertainment'],
  ['Nintendo Switch Online','entertainment'],
  ['EA Play',               'entertainment'],
  ['Ubisoft+',              'entertainment'],
  ['Apple Arcade',          'entertainment'],
  ['Google Play Pass',      'entertainment'],
  ['GeForce Now',           'entertainment'],
  ['Xbox Cloud Gaming',     'entertainment'],

  // ─── בידור: ספרים ופודקאסטים ───
  ['Audible',               'entertainment'],
  ['Kindle Unlimited',      'entertainment'],
  ['Scribd',                'entertainment'],
  ['Storytel',              'entertainment'],
  ['Pocket Casts',          'entertainment'],
  ['Luminary',              'entertainment'],

  // ─── תוכנה: עבודה ופרודוקטיביות ───
  ['Adobe Creative Cloud',  'software'],
  ['Adobe Acrobat',         'software'],
  ['Microsoft 365',         'software'],
  ['Office 365',            'software'],
  ['Google Workspace',      'software'],
  ['G Suite',               'software'],
  ['Dropbox',               'software'],
  ['Dropbox Plus',          'software'],
  ['iCloud+',               'software'],
  ['iCloud',                'software'],
  ['OneDrive',              'software'],
  ['Google One',            'software'],
  ['Notion',                'software'],
  ['Notion AI',             'software'],
  ['Evernote',              'software'],
  ['Obsidian Sync',         'software'],
  ['Slack',                 'software'],
  ['Zoom',                  'software'],
  ['Zoom Pro',              'software'],
  ['Figma',                 'software'],
  ['Canva Pro',             'software'],
  ['Grammarly',             'software'],
  ['Grammarly Premium',     'software'],
  ['GitHub',                'software'],
  ['GitHub Copilot',        'software'],
  ['JetBrains',             'software'],
  ['1Password',             'software'],
  ['LastPass',              'software'],
  ['Dashlane',              'software'],
  ['Bitwarden',             'software'],
  ['Claude Pro',            'software'],
  ['ChatGPT Plus',          'software'],
  ['ChatGPT',               'software'],
  ['Gemini Advanced',       'software'],
  ['Copilot Pro',           'software'],
  ['Midjourney',            'software'],
  ['Monday.com',            'software'],
  ['Asana',                 'software'],
  ['Jira',                  'software'],
  ['Trello',                'software'],
  ['Basecamp',              'software'],
  ['Linear',                'software'],
  ['Airtable',              'software'],
  ['Webflow',               'software'],
  ['Wix',                   'software'],
  ['Squarespace',           'software'],
  ['Shopify',               'software'],
  ['Mailchimp',             'software'],
  ['HubSpot',               'software'],
  ['Salesforce',            'software'],
  ['QuickBooks',            'software'],
  ['Xero',                  'software'],

  // ─── תוכנה: אבטחה ו-VPN ───
  ['NordVPN',               'software'],
  ['ExpressVPN',            'software'],
  ['Surfshark',             'software'],
  ['ProtonVPN',             'software'],
  ['Mullvad',               'software'],
  ['Norton',                'software'],
  ['McAfee',                'software'],
  ['Kaspersky',             'software'],
  ['Bitdefender',           'software'],
  ['Malwarebytes',          'software'],

  // ─── כושר ובריאות ───
  ['Apple Fitness+',        'fitness'],
  ['Peloton',               'fitness'],
  ['Nike Training Club',    'fitness'],
  ['Headspace',             'fitness'],
  ['Calm',                  'fitness'],
  ['Noom',                  'fitness'],
  ['MyFitnessPal Premium',  'fitness'],
  ['Strava',                'fitness'],
  ['Garmin Connect',        'fitness'],
  ['Whoop',                 'fitness'],
  ['Oura Ring',             'fitness'],
  ['Peloton App',           'fitness'],
  ['Beachbody',             'fitness'],
  ['Daily Burn',            'fitness'],
  ['ClassPass',             'fitness'],
  ['Alo Moves',             'fitness'],
  ['Glo Yoga',              'fitness'],
  ['Insight Timer',         'fitness'],
  ['Waking Up',             'fitness'],

  // ─── חינוך ───
  ['Duolingo Plus',         'education'],
  ['Duolingo',              'education'],
  ['Coursera',              'education'],
  ['Coursera Plus',         'education'],
  ['Udemy',                 'education'],
  ['LinkedIn Learning',     'education'],
  ['Masterclass',           'education'],
  ['Skillshare',            'education'],
  ['Rosetta Stone',         'education'],
  ['Babbel',                'education'],
  ['Pimsleur',              'education'],
  ['Chegg',                 'education'],
  ['Khan Academy',          'education'],
  ['Brilliant',             'education'],
  ['Codecademy',            'education'],
  ['Pluralsight',           'education'],
  ['Frontend Masters',      'education'],
  ['Egghead',               'education'],
  ["O'Reilly Learning",     'education'],
  ['Udacity',               'education'],
  ['edX',                   'education'],

  // ─── תקשורת ───
  ['Partner',               'communication'],
  ['Cellcom',               'communication'],
  ['HOT Mobile',            'communication'],
  ['Golan Telecom',         'communication'],
  ['012 Mobile',            'communication'],
  ['Bezeq',                 'communication'],
  ['Hot Internet',          'communication'],
  ['Partner Internet',      'communication'],
  ['Unlimited',             'communication'],
  ['iMessage',              'communication'],
  ['WhatsApp Business',     'communication'],
  ['AT&T',                  'communication'],
  ['Verizon',               'communication'],
  ['T-Mobile',              'communication'],

  // ─── בית ───
  ['Amazon Alexa',          'home'],
  ['Google Nest',           'home'],
  ['Ring',                  'home'],
  ['ADT',                   'home'],
  ['SimpliSafe',            'home'],
  ['Nest Aware',            'home'],
  ['iRobot',                'home'],
  ['Ecobee',                'home'],
  ['HomeAdvisor',           'home'],

  // ─── רכב ───
  ['Tesla Premium Connectivity', 'automotive'],
  ['SiriusXM',              'automotive'],
  ['Waze Unlimited',        'automotive'],
  ['HERE Maps',             'automotive'],
  ['OnStar',                'automotive'],
  ['Connected Drive',       'automotive'],

  // ─── מועדוני לקוחות ───
  ['Amazon Prime',          'loyalty'],
  ['Costco',                'loyalty'],
  ['Sam\'s Club',           'loyalty'],
  ['Walmart+',              'loyalty'],
  ['Target Circle',         'loyalty'],
  ['BJ\'s Wholesale',       'loyalty'],

  // ─── צדקה ───
  ['Patreon',               'charity'],
  ['Buy Me a Coffee',       'charity'],
  ['Ko-fi',                 'charity'],

  // ─── אחר ───
  ['The New York Times',    'other'],
  ['Washington Post',       'other'],
  ['Wall Street Journal',   'other'],
  ['The Athletic',          'other'],
  ['Medium',                'other'],
  ['Substack',              'other'],
  ['Haaretz',               'other'],
  ['TheMarker',             'other'],
  ['Calcalist',             'other'],
  ['Ynet Premium',          'other'],
];

/**
 * Flat list of service names (for autocomplete filtering).
 */
export const SUBSCRIPTION_SERVICE_NAMES: string[] = SUBSCRIPTION_SERVICES.map(([name]) => name);

/**
 * Map of lowercase service name → categoryId for O(1) lookup.
 */
const SERVICE_CATEGORY_MAP: Record<string, string> = Object.fromEntries(
  SUBSCRIPTION_SERVICES.map(([name, cat]) => [name.toLowerCase(), cat])
);

/**
 * Returns the categoryId for a known service, or null if unknown.
 */
export function getCategoryForService(serviceName: string): string | null {
  return SERVICE_CATEGORY_MAP[serviceName.trim().toLowerCase()] ?? null;
}
