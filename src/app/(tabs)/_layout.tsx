import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { t } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { colors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color as string} size={size} />
  );
}

export default function TabLayout() {
  const { ui } = useSession();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}>
      <Tabs.Screen name="index" options={{ title: t(ui, 'tabHome'), tabBarIcon: icon('home') }} />
      <Tabs.Screen name="learn" options={{ title: t(ui, 'tabLearn'), tabBarIcon: icon('book') }} />
      <Tabs.Screen name="call" options={{ title: t(ui, 'tabCall'), tabBarIcon: icon('call') }} />
      <Tabs.Screen name="speak" options={{ title: t(ui, 'tabSpeak'), tabBarIcon: icon('mic') }} />
      <Tabs.Screen name="profile" options={{ title: t(ui, 'tabProfile'), tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
