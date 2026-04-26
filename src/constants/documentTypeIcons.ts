import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentType } from '@/types/documentTypes';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

/**
 * Canonical icon mapping for document types.
 * Single source of truth used by DocumentCard, document/[id].tsx, and add-document.tsx.
 */
export const DOCUMENT_TYPE_ICONS: Record<DocumentType, IoniconsName> = {
  id_card:   'person-circle-outline',
  license:   'car-outline',
  passport:  'airplane-outline',
  insurance: 'shield-checkmark-outline',
  other:     'document-outline',
};

/** Ordered list for choice-card rendering in add-document.tsx */
export const DOCUMENT_TYPE_OPTIONS: { type: DocumentType; icon: IoniconsName }[] = [
  { type: 'id_card',   icon: DOCUMENT_TYPE_ICONS.id_card },
  { type: 'license',   icon: DOCUMENT_TYPE_ICONS.license },
  { type: 'passport',  icon: DOCUMENT_TYPE_ICONS.passport },
  { type: 'insurance', icon: DOCUMENT_TYPE_ICONS.insurance },
  { type: 'other',     icon: DOCUMENT_TYPE_ICONS.other },
];
