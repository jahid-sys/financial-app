import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';

export default function TabLayout() {
  // Define the tabs configuration
  const tabs: TabBarItem[] = [
    {
      name: '(home)',
      route: '/(tabs)/(home)/',
      icon: 'account-balance-wallet',
      label: 'Transactions',
    },
    {
      name: 'stocks',
      route: '/(tabs)/stocks',
      icon: 'trending-up',
      label: 'Stocks',
    },
  ];

  // For Android and Web, use Stack navigation with custom floating tab bar
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none', // Remove fade animation to prevent black screen flash
        }}
      >
        <Stack.Screen key="home" name="(home)" />
        <Stack.Screen key="stocks" name="stocks" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
