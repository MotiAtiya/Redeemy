import { SafeAreaView, StyleSheet, Text } from 'react-native';

export default function StoresScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.placeholder}>Stores</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  placeholder: { padding: 16, fontSize: 16, color: '#333' },
});
