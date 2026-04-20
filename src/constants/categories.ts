import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface Category {
  id: string;
  label: string;
  icon: IoniconsName;
}

/** 15 default credit categories (5 rows × 3) */
export const CATEGORIES: Category[] = [
  { id: 'food',        label: 'Supermarket',         icon: 'basket-outline'        },
  { id: 'dining',      label: 'Dining & Cafes',      icon: 'cafe-outline'          },
  { id: 'fashion',     label: 'Fashion',             icon: 'shirt-outline'         },
  { id: 'electronics', label: 'Electronics',         icon: 'phone-portrait-outline'},
  { id: 'home',        label: 'Home & Garden',       icon: 'home-outline'          },
  { id: 'beauty',      label: 'Beauty & Health',     icon: 'heart-outline'         },
  { id: 'sports',      label: 'Sports & Fitness',    icon: 'bicycle-outline'       },
  { id: 'travel',      label: 'Travel',              icon: 'airplane-outline'      },
  { id: 'toys',        label: 'Toys & Kids',         icon: 'happy-outline'         },
  { id: 'online',      label: 'Online Shopping',     icon: 'cart-outline'          },
  { id: 'finance',     label: 'Finance',             icon: 'card-outline'          },
  { id: 'books',       label: 'Books & Media',       icon: 'book-outline'          },
  { id: 'jewelry',     label: 'Jewelry & Watches',   icon: 'diamond-outline'       },
  { id: 'health',      label: 'Health & Wellness',   icon: 'fitness-outline'       },
  { id: 'other',       label: 'Other',               icon: 'gift-outline'          },
];

export const DEFAULT_CATEGORY_ID = 'other';
