import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface SubscriptionCategory {
  id: string;
  label: string;
  icon: IoniconsName;
}

export const SUBSCRIPTION_CATEGORIES: SubscriptionCategory[] = [
  { id: 'communication', label: 'Communication',    icon: 'phone-portrait-outline'     },
  { id: 'entertainment', label: 'Entertainment',    icon: 'film-outline'               },
  { id: 'ai',            label: 'AI',               icon: 'sparkles-outline'           },
  { id: 'software',      label: 'Software',         icon: 'laptop-outline'             },
  { id: 'fitness',       label: 'Fitness',          icon: 'barbell-outline'            },
  { id: 'education',     label: 'Education',        icon: 'school-outline'             },
  { id: 'health',        label: 'Healthcare',       icon: 'medical-outline'            },
  { id: 'insurance',     label: 'Insurance',        icon: 'shield-checkmark-outline'   },
  { id: 'charity',       label: 'Charity',          icon: 'heart-outline'              },
  { id: 'home',          label: 'Home',             icon: 'home-outline'               },
  { id: 'automotive',    label: 'Automotive',       icon: 'car-outline'                },
  { id: 'loyalty',       label: 'Loyalty Club',     icon: 'pricetag-outline'           },
  { id: 'other',         label: 'Other',            icon: 'grid-outline'               },
];
