import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface WarrantyProductType {
  id: string;
  heLabel: string;
  enLabel: string;
  icon: IoniconsName;
}

/**
 * Pick the correct localized label for a product type id, with sensible
 * fallbacks: missing entry → echo the id; nullish input → empty string.
 * Pass `i18n.language` from useTranslation().
 */
export function getWarrantyProductLabel(
  productType: string | undefined | null,
  language: string | undefined,
): string {
  if (!productType) return '';
  const found = WARRANTY_PRODUCT_TYPES.find((p) => p.id === productType);
  if (!found) return productType;
  return language?.startsWith('en') ? found.enLabel : found.heLabel;
}

export const WARRANTY_PRODUCT_TYPES: WarrantyProductType[] = [
  // אלקטרוניקה וטכנולוגיה
  { id: 'smartphone',         heLabel: 'טלפון חכם',           enLabel: 'Smartphone',          icon: 'phone-portrait-outline' },
  { id: 'laptop',             heLabel: 'מחשב נייד',            enLabel: 'Laptop',              icon: 'laptop-outline' },
  { id: 'desktop',            heLabel: 'מחשב שולחני',          enLabel: 'Desktop Computer',    icon: 'desktop-outline' },
  { id: 'tablet',             heLabel: 'טאבלט',                enLabel: 'Tablet',              icon: 'tablet-portrait-outline' },
  { id: 'tv',                 heLabel: 'טלוויזיה',             enLabel: 'TV',                  icon: 'tv-outline' },
  { id: 'headphones',         heLabel: 'אוזניות',              enLabel: 'Headphones',          icon: 'headset-outline' },
  { id: 'earbuds',            heLabel: 'אוזניות אלחוטיות',     enLabel: 'Earbuds',             icon: 'headset-outline' },
  { id: 'speaker',            heLabel: 'רמקול',                enLabel: 'Speaker',             icon: 'musical-notes-outline' },
  { id: 'camera',             heLabel: 'מצלמה',                enLabel: 'Camera',              icon: 'camera-outline' },
  { id: 'action_camera',      heLabel: 'מצלמת אקשן',           enLabel: 'Action Camera',       icon: 'camera-outline' },
  { id: 'smartwatch',         heLabel: 'שעון חכם',             enLabel: 'Smartwatch',          icon: 'watch-outline' },
  { id: 'gaming_console',     heLabel: 'קונסולת משחקים',       enLabel: 'Gaming Console',      icon: 'game-controller-outline' },
  { id: 'printer',            heLabel: 'מדפסת',                enLabel: 'Printer',             icon: 'print-outline' },
  { id: 'monitor',            heLabel: 'מסך מחשב',             enLabel: 'Monitor',             icon: 'desktop-outline' },
  { id: 'router',             heLabel: 'ראוטר / מודם',         enLabel: 'Router / Modem',      icon: 'wifi-outline' },
  { id: 'projector',          heLabel: 'מקרן',                 enLabel: 'Projector',           icon: 'tv-outline' },
  { id: 'e_reader',           heLabel: 'קורא ספרים',           enLabel: 'E-Reader',            icon: 'book-outline' },
  { id: 'external_storage',   heLabel: 'כונן חיצוני',          enLabel: 'External Drive',      icon: 'save-outline' },
  { id: 'power_bank',         heLabel: 'סוללת גיבוי',          enLabel: 'Power Bank',          icon: 'battery-charging-outline' },
  { id: 'security_camera',    heLabel: 'מצלמת אבטחה',          enLabel: 'Security Camera',     icon: 'videocam-outline' },
  { id: 'dash_cam',           heLabel: 'מצלמת דרך',            enLabel: 'Dash Camera',         icon: 'videocam-outline' },
  { id: 'smart_home_hub',     heLabel: 'בית חכם',              enLabel: 'Smart Home Hub',      icon: 'home-outline' },
  { id: 'drone',              heLabel: 'רחפן',                 enLabel: 'Drone',               icon: 'airplane-outline' },
  { id: 'ups',                heLabel: 'ספק כוח רציף (UPS)',   enLabel: 'UPS Battery Backup',  icon: 'battery-full-outline' },

  // מוצרי חשמל ביתיים — גדולים
  { id: 'refrigerator',       heLabel: 'מקרר',                 enLabel: 'Refrigerator',        icon: 'snow-outline' },
  { id: 'freezer',            heLabel: 'מקפיא',                enLabel: 'Freezer',             icon: 'snow-outline' },
  { id: 'washing_machine',    heLabel: 'מכונת כביסה',          enLabel: 'Washing Machine',     icon: 'water-outline' },
  { id: 'dryer',              heLabel: 'מייבש כביסה',          enLabel: 'Dryer',               icon: 'sunny-outline' },
  { id: 'dishwasher',         heLabel: 'מדיח כלים',            enLabel: 'Dishwasher',          icon: 'water-outline' },
  { id: 'oven',               heLabel: 'תנור אפייה',            enLabel: 'Oven',                icon: 'flame-outline' },
  { id: 'cooktop',            heLabel: 'כיריים',               enLabel: 'Cooktop / Stove',     icon: 'flame-outline' },
  { id: 'range_hood',         heLabel: 'קולט אדים',            enLabel: 'Range Hood',          icon: 'cloudy-outline' },
  { id: 'ac',                 heLabel: 'מזגן',                  enLabel: 'Air Conditioner',     icon: 'thermometer-outline' },
  { id: 'water_heater',       heLabel: 'דוד חשמלי',            enLabel: 'Water Heater',        icon: 'water-outline' },
  { id: 'heater',             heLabel: 'תנור חימום',            enLabel: 'Heater',              icon: 'flame-outline' },
  { id: 'fan',                heLabel: 'מאוורר',               enLabel: 'Fan',                 icon: 'partly-sunny-outline' },
  { id: 'air_purifier',       heLabel: 'מטהר אוויר',            enLabel: 'Air Purifier',        icon: 'leaf-outline' },
  { id: 'dehumidifier',       heLabel: 'מפחית לחות',           enLabel: 'Dehumidifier',        icon: 'water-outline' },
  { id: 'humidifier',         heLabel: 'מכשיר אדים',           enLabel: 'Humidifier',          icon: 'rainy-outline' },
  { id: 'water_filter',       heLabel: 'מסנן / מטהר מים',      enLabel: 'Water Filter',        icon: 'water-outline' },

  // מוצרי חשמל ביתיים — קטנים
  { id: 'vacuum',             heLabel: 'שואב אבק',             enLabel: 'Vacuum Cleaner',      icon: 'sparkles-outline' },
  { id: 'robot_vacuum',       heLabel: 'שואב אבק רובוטי',      enLabel: 'Robot Vacuum',        icon: 'sparkles-outline' },
  { id: 'coffee_machine',     heLabel: 'מכונת קפה',            enLabel: 'Coffee Machine',      icon: 'cafe-outline' },
  { id: 'kettle',             heLabel: 'קומקום',                enLabel: 'Kettle',              icon: 'cafe-outline' },
  { id: 'toaster',            heLabel: 'טוסטר',                enLabel: 'Toaster',             icon: 'flame-outline' },
  { id: 'microwave',          heLabel: 'מיקרוגל',              enLabel: 'Microwave',           icon: 'radio-outline' },
  { id: 'blender',            heLabel: 'בלנדר / מיקסר',        enLabel: 'Blender / Mixer',     icon: 'nutrition-outline' },
  { id: 'food_processor',     heLabel: 'מעבד מזון',            enLabel: 'Food Processor',      icon: 'nutrition-outline' },
  { id: 'air_fryer',          heLabel: 'אייר פריייר',          enLabel: 'Air Fryer',           icon: 'flame-outline' },
  { id: 'electric_grill',     heLabel: 'גריל חשמלי',           enLabel: 'Electric Grill',      icon: 'flame-outline' },
  { id: 'sandwich_maker',     heLabel: 'סנדוויצ\'ייה',         enLabel: 'Sandwich Maker',      icon: 'restaurant-outline' },
  { id: 'juicer',             heLabel: 'מסחטת מיצים',          enLabel: 'Juicer',              icon: 'nutrition-outline' },
  { id: 'bread_machine',      heLabel: 'מכונת לחם',            enLabel: 'Bread Machine',       icon: 'restaurant-outline' },
  { id: 'iron',               heLabel: 'מגהץ',                  enLabel: 'Iron',                icon: 'shirt-outline' },
  { id: 'sewing_machine',     heLabel: 'מכונת תפירה',          enLabel: 'Sewing Machine',      icon: 'construct-outline' },

  // טיפוח אישי
  { id: 'hair_dryer',         heLabel: 'מייבש שיער',           enLabel: 'Hair Dryer',          icon: 'sparkles-outline' },
  { id: 'hair_straightener',  heLabel: 'מחליק שיער',           enLabel: 'Hair Straightener',   icon: 'sparkles-outline' },
  { id: 'electric_shaver',    heLabel: 'מכונת גילוח',          enLabel: 'Electric Shaver',     icon: 'cut-outline' },
  { id: 'electric_toothbrush',heLabel: 'מברשת שיניים חשמלית',  enLabel: 'Electric Toothbrush', icon: 'medical-outline' },

  // ריהוט
  { id: 'sofa',               heLabel: 'ספה',                  enLabel: 'Sofa',                icon: 'home-outline' },
  { id: 'bed_mattress',       heLabel: 'מיטה / מזרן',          enLabel: 'Bed / Mattress',      icon: 'bed-outline' },
  { id: 'baby_crib',          heLabel: 'מיטת תינוק',           enLabel: 'Baby Crib',           icon: 'bed-outline' },
  { id: 'wardrobe',           heLabel: 'ארון בגדים',           enLabel: 'Wardrobe',            icon: 'grid-outline' },
  { id: 'dining_table',       heLabel: 'שולחן אוכל',           enLabel: 'Dining Table',        icon: 'restaurant-outline' },
  { id: 'desk',               heLabel: 'שולחן עבודה',          enLabel: 'Desk',                icon: 'laptop-outline' },
  { id: 'office_chair',       heLabel: 'כיסא משרד',            enLabel: 'Office Chair',        icon: 'person-outline' },
  { id: 'bookcase',           heLabel: 'ספרייה / מדף',         enLabel: 'Bookcase / Shelf',    icon: 'library-outline' },
  { id: 'tv_stand',           heLabel: 'מזנון טלוויזיה',       enLabel: 'TV Stand / Cabinet',  icon: 'tv-outline' },

  // כלי עבודה
  { id: 'drill',              heLabel: 'מקדחה',                enLabel: 'Drill',               icon: 'construct-outline' },
  { id: 'electric_screwdriver',heLabel: 'מברג חשמלי',         enLabel: 'Electric Screwdriver',icon: 'construct-outline' },
  { id: 'circular_saw',       heLabel: 'מסור עגול',            enLabel: 'Circular Saw',        icon: 'construct-outline' },
  { id: 'angle_grinder',      heLabel: 'גרינדר',               enLabel: 'Angle Grinder',       icon: 'construct-outline' },
  { id: 'pressure_washer',    heLabel: 'שוטפת לחץ',            enLabel: 'Pressure Washer',     icon: 'water-outline' },
  { id: 'lawn_mower',         heLabel: 'מכסחת דשא',            enLabel: 'Lawn Mower',          icon: 'leaf-outline' },
  { id: 'generator',          heLabel: 'גנרטור',               enLabel: 'Generator',           icon: 'flash-outline' },

  // אופנה והנעלה
  { id: 'shoes',              heLabel: 'נעליים',               enLabel: 'Shoes',               icon: 'footsteps-outline' },
  { id: 'jacket_coat',        heLabel: 'מעיל / ז\'קט',         enLabel: 'Jacket / Coat',       icon: 'shirt-outline' },
  { id: 'bag',                heLabel: 'תיק',                  enLabel: 'Bag',                 icon: 'bag-outline' },
  { id: 'watch',              heLabel: 'שעון יד',              enLabel: 'Watch',               icon: 'watch-outline' },
  { id: 'glasses',            heLabel: 'משקפיים',              enLabel: 'Glasses',             icon: 'glasses-outline' },
  { id: 'sunglasses',         heLabel: 'משקפי שמש',            enLabel: 'Sunglasses',          icon: 'sunny-outline' },

  // ספורט וכושר
  { id: 'bicycle',            heLabel: 'אופניים',              enLabel: 'Bicycle',             icon: 'bicycle-outline' },
  { id: 'scooter',            heLabel: 'קורקינט חשמלי',        enLabel: 'Electric Scooter',    icon: 'bicycle-outline' },
  { id: 'treadmill',          heLabel: 'הליכון',               enLabel: 'Treadmill',           icon: 'fitness-outline' },
  { id: 'exercise_bike',      heLabel: 'אופני כושר',           enLabel: 'Exercise Bike',       icon: 'bicycle-outline' },
  { id: 'elliptical',         heLabel: 'אליפטיקל',             enLabel: 'Elliptical Trainer',  icon: 'fitness-outline' },
  { id: 'rowing_machine',     heLabel: 'מכונת חתירה',          enLabel: 'Rowing Machine',      icon: 'fitness-outline' },
  { id: 'tent',               heLabel: 'אוהל',                 enLabel: 'Tent',                icon: 'triangle-outline' },

  // רכב
  { id: 'car_battery',        heLabel: 'מצבר רכב',             enLabel: 'Car Battery',         icon: 'car-outline' },
  { id: 'tires',              heLabel: 'צמיגים',               enLabel: 'Tires',               icon: 'car-sport-outline' },
  { id: 'car_seat',           heLabel: 'כיסא בטיחות לרכב',     enLabel: 'Car Seat',            icon: 'car-outline' },
  { id: 'car_part',           heLabel: 'חלק לרכב',             enLabel: 'Car Part',            icon: 'settings-outline' },

  // בריאות ורפואה
  { id: 'hearing_aid',        heLabel: 'מכשיר שמיעה',          enLabel: 'Hearing Aid',         icon: 'ear-outline' },
  { id: 'blood_pressure',     heLabel: 'מד לחץ דם',            enLabel: 'Blood Pressure Monitor', icon: 'medkit-outline' },
  { id: 'massage_device',     heLabel: 'מכשיר עיסוי',          enLabel: 'Massage Device',      icon: 'body-outline' },
  { id: 'medical_device',     heLabel: 'מכשיר רפואי',          enLabel: 'Medical Device',      icon: 'medkit-outline' },

  // תינוקות וילדים
  { id: 'stroller',           heLabel: 'עגלת תינוק',           enLabel: 'Stroller',            icon: 'person-outline' },
  { id: 'baby_monitor',       heLabel: 'אינטרקום לתינוק',      enLabel: 'Baby Monitor',        icon: 'videocam-outline' },
  { id: 'toy',                heLabel: 'צעצוע',                enLabel: 'Toy',                 icon: 'happy-outline' },

  // מוזיקה
  { id: 'guitar',             heLabel: 'גיטרה',                enLabel: 'Guitar',              icon: 'musical-note-outline' },
  { id: 'piano_keyboard',     heLabel: 'פסנתר / קלידים',       enLabel: 'Piano / Keyboard',    icon: 'musical-notes-outline' },
  { id: 'amplifier',          heLabel: 'מגבר',                 enLabel: 'Amplifier',           icon: 'musical-notes-outline' },
  { id: 'microphone',         heLabel: 'מיקרופון',             enLabel: 'Microphone',          icon: 'mic-outline' },
  { id: 'drums',              heLabel: 'תופים',                enLabel: 'Drum Kit',            icon: 'musical-notes-outline' },

  // שונות
  { id: 'solar_panel',        heLabel: 'פאנל סולארי',          enLabel: 'Solar Panel',         icon: 'sunny-outline' },
  { id: 'other',              heLabel: 'אחר',                  enLabel: 'Other',               icon: 'ellipsis-horizontal-outline' },
];
