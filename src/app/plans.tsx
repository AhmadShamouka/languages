import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { type ComponentType } from 'react';
import { Platform } from 'react-native';

import { Body, Card, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { t, type StringKey } from '@/lib/i18n';
import { useLearner } from '@/lib/session';

const PLANS: { id: 'free' | 'day' | 'week' | 'month' | 'year'; title: StringKey; body: StringKey }[] = [
  { id: 'free', title: 'planFree', body: 'planFreeBody' },
  { id: 'day', title: 'planDay', body: 'planDayBody' },
  { id: 'week', title: 'planWeek', body: 'planWeekBody' },
  { id: 'month', title: 'planMonth', body: 'planMonthBody' },
  { id: 'year', title: 'planYear', body: 'planYearBody' },
];

const playBilling = Platform.OS === 'android' && Constants.executionEnvironment !== 'storeClient';

export default function PlansScreen() {
  if (playBilling) {
    const PlayPlans = require('@/components/PlayPlans').default as ComponentType;
    return <PlayPlans />;
  }
  return <PlanList />;
}

function PlanList() {
  const { profile, ui } = useLearner();
  const until = profile.planExpiresAt?.slice(0, 10);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t(ui, 'yourPlan'), headerShown: true }} />
      <Title>{t(ui, 'yourPlan')}</Title>
      {profile.plan !== 'free' && until ? <Muted>{t(ui, 'planActive', { date: until })}</Muted> : null}
      {PLANS.map((plan) => (
        <Card key={plan.id}>
          <Body>{t(ui, plan.title)}</Body>
          <Muted>{t(ui, plan.body)}</Muted>
        </Card>
      ))}
      <ErrorText message={t(ui, 'billingUnavailable')} />
    </Screen>
  );
}
