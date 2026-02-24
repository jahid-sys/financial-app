
import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Label>Transactions</Label>
        <Icon 
          sf={{ default: 'dollarsign.circle', selected: 'dollarsign.circle.fill' }} 
          drawable="account-balance-wallet" 
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stocks">
        <Label>Stocks</Label>
        <Icon 
          sf={{ default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis.circle.fill' }} 
          drawable="trending-up" 
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
