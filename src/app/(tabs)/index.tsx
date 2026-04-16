import { SafeAreaView, StyleSheet, Text } from 'react-native';

export default function CreditsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.placeholder}>Credits</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  placeholder: { padding: 16, fontSize: 16, color: '#333' },
});
