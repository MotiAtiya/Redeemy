import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface Category {
  id: string;
  label: string;
  icon: IoniconsName;
}

/** 9 default credit categories */
export const CATEGORIES: Category[] = [
  { id: 'food',        label: 'Food & Dining',      icon: 'restaurant-outline'    },
  { id: 'fashion',     label: 'Fashion',             icon: 'shirt-outline'         },
  { id: 'electronics', label: 'Electronics',         icon: 'phone-portrait-outline'},
  { id: 'home',        label: 'Home & Garden',       icon: 'home-outline'          },
  { id: 'beauty',      label: 'Beauty & Health',     icon: 'heart-outline'         },
  { id: 'books',       label: 'Books & Media',       icon: 'book-outline'          },
  { id: 'sports',      label: 'Sports & Fitness',    icon: 'bicycle-outline'       },
  { id: 'travel',      label: 'Travel',              icon: 'airplane-outline'      },
  { id: 'other',       label: 'Other',               icon: 'gift-outline'          },
];

export const DEFAULT_CATEGORY_ID = 'other';
