import { View, Text, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';

interface Props {
  /** Already-translated string to render (e.g. t('warranty.notFound')). */
  message: string;
}

/**
 * Shared "item not found" view for detail screens. Used when the resolved
 * store item is undefined (e.g. mid-delete or invalid id deep-link). Renders
 * a top-left back arrow and the centered message.
 */
export function NotFoundScreen({ message }: Props) {
  const colors = useAppTheme();
  const router = useRouter();
  const isRTL = I18nManager.isRTL;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons
          name={isRTL ? 'arrow-forward' : 'arrow-back'}
          size={24}
          color={colors.textPrimary}
        />
      </TouchableOpacity>
      <View style={styles.body}>
        <Text style={[styles.text, { color: colors.textTertiary }]}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  backButton: { padding: 16 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16 },
});
