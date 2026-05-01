import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DocumentCard } from '@/components/redeemy/DocumentCard';
import { SearchBar } from '@/components/redeemy/SearchBar';
import { EmptyState } from '@/components/redeemy/EmptyState';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { subscribeToDocuments } from '@/lib/firestoreDocuments';
import { useAppTheme } from '@/hooks/useAppTheme';
import { type DocumentType } from '@/types/documentTypes';
import type { AppColors } from '@/constants/colors';

type SortKey = 'expiration' | 'name' | 'type';

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
    sortMenu: {
      position: 'absolute',
      top: 56,
      right: 16,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 6,
      zIndex: 10,
      minWidth: 160,
      overflow: 'hidden',
    },
    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sortOptionActive: { backgroundColor: colors.background },
    sortOptionText: { fontSize: 14, color: colors.textPrimary },
    sortOptionTextActive: { color: colors.primary, fontWeight: '600' },
    filterChips: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
    filterChip: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.separator,
      backgroundColor: colors.surface,
      alignSelf: 'flex-start',
    },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText: { fontSize: 13, color: colors.textSecondary },
    filterChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
    list: { flex: 1 },
    listContent: { paddingTop: 4, paddingBottom: 100 },
    listContentEmpty: { flex: 1 },
    fab: {
      position: 'absolute',
      bottom: 28,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
  });
}

const TYPE_FILTERS: DocumentType[] = ['id_card', 'license', 'passport', 'insurance', 'other'];

export default function DocumentsScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'expiration', label: t('documents.sort.expiration') },
    { key: 'name',       label: t('documents.sort.name')       },
    { key: 'type',       label: t('documents.sort.type')       },
  ];

  const currentUser = useAuthStore((s) => s.currentUser);
  const familyId = useSettingsStore((s) => s.familyId);
  const documents = useDocumentsStore((s) => s.documents);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('expiration');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToDocuments(currentUser.uid, familyId);
    return unsub;
  }, [currentUser, familyId]);

  const availableTypes = useMemo(
    () => TYPE_FILTERS.filter((type) => documents.some((d) => d.type === type)),
    [documents]
  );

  const filteredDocuments = useMemo(() => {
    let list = documents;

    if (selectedType) {
      list = list.filter((d) => d.type === selectedType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((d) =>
        d.ownerName.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const dateA = a.expirationDate instanceof Date ? a.expirationDate : new Date(a.expirationDate as unknown as string);
      const dateB = b.expirationDate instanceof Date ? b.expirationDate : new Date(b.expirationDate as unknown as string);

      if (sortKey === 'expiration') {
        return dateA.getTime() - dateB.getTime();
      }
      if (sortKey === 'name') {
        return a.ownerName.localeCompare(b.ownerName, 'he');
      }
      // type — alphabetical
      return a.type.localeCompare(b.type);
    });
  }, [documents, searchQuery, selectedType, sortKey]);

  function renderEmpty() {
    if (documents.length > 0) {
      return (
        <EmptyState
          icon="search-outline"
          iconSize={48}
          title={t('documents.noResults')}
        />
      );
    }
    return (
      <EmptyState
        icon="documents-outline"
        title={t('documents.empty.title')}
        subtitle={t('documents.empty.subtitle')}
        actionLabel={t('documents.empty.action')}
        onAction={() => router.push('/add-document')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View>
        <View style={styles.header}>
          <Text style={styles.title}>{t('documents.title')}</Text>
          <TouchableOpacity onPress={() => setShowSortMenu((s) => !s)}>
            <Ionicons name="swap-vertical-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {showSortMenu && (
          <View style={styles.sortMenu}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortOption, sortKey === opt.key && styles.sortOptionActive]}
                onPress={() => { setSortKey(opt.key); setShowSortMenu(false); }}
              >
                <Text style={[styles.sortOptionText, sortKey === opt.key && styles.sortOptionTextActive]}>
                  {opt.label}
                </Text>
                {sortKey === opt.key && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder={t('documents.search')} />

        {availableTypes.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {([null, ...availableTypes] as (DocumentType | null)[]).map((type) => {
              const isActive = type === selectedType;
              return (
                <TouchableOpacity
                  key={type ?? 'all'}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedType(isActive ? null : type)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {type ? t(`documents.types.${type}`) : t('documents.filter.all')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          filteredDocuments.length === 0 && styles.listContentEmpty,
        ]}
        data={filteredDocuments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DocumentCard
            document={item}
            onPress={() => router.push(`/document/${item.id}`)}
          />
        )}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-document')}
        accessibilityRole="button"
        accessibilityLabel={t('documents.empty.action')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
