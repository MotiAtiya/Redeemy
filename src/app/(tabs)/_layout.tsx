import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/hooks/useAppTheme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconsName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabLayout() {
  const colors = useAppTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.iconInactive,
        tabBarStyle: {
          borderTopColor: colors.separator,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.credits'),
          tabBarIcon: tabIcon('wallet-outline'),
        }}
      />
      <Tabs.Screen
        name="warranties"
        options={{
          title: t('tabs.warranties'),
          tabBarIcon: tabIcon('shield-checkmark-outline'),
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: t('tabs.subscriptions'),
          tabBarIcon: tabIcon('repeat-outline'),
        }}
      />
      <Tabs.Screen
        name="occasions"
        options={{
          title: t('tabs.occasions'),
          tabBarIcon: tabIcon('heart-outline'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: tabIcon('time-outline'),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: tabIcon('ellipsis-horizontal-outline'),
        }}
      />
    </Tabs>
  );
}
