import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ErrorCode, getAvailablePurchases, useIAP, type Product, type ProductSubscription, type Purchase } from 'expo-iap';

import { Body, Button, Card, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { t } from '@/lib/i18n';
import { useLearner } from '@/lib/session';

const PRODUCTS = {
  day: { id: 'aloro_day', title: 'planDay', body: 'planDayBody', kind: 'in-app' },
  week: { id: 'aloro_week', title: 'planWeek', body: 'planWeekBody', kind: 'subs' },
  month: { id: 'aloro_month', title: 'planMonth', body: 'planMonthBody', kind: 'subs' },
  year: { id: 'aloro_year', title: 'planYear', body: 'planYearBody', kind: 'subs' },
} as const;

type PaidPlan = keyof typeof PRODUCTS;

function priceFor(products: Product[], subscriptions: ProductSubscription[], id: string): string | null {
  const item = [...products, ...subscriptions].find((product) => product.id === id);
  return item?.displayPrice ?? null;
}

function offerToken(subscriptions: ProductSubscription[], id: string): string | null {
  const item = subscriptions.find((product) => product.id === id);
  if (!item || item.platform !== 'android') return null;
  return item.subscriptionOffers.find((offer) => offer.offerTokenAndroid)?.offerTokenAndroid ?? null;
}

export default function PlayPlans() {
  const { profile, ui, confirmPurchase } = useLearner();
  const [busy, setBusy] = useState<PaidPlan | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef(confirmPurchase);
  confirmRef.current = confirmPurchase;
  const finishRef = useRef<((purchase: Purchase, consumable: boolean) => Promise<void>) | null>(null);
  const delivered = useRef(new Set<string>());

  const deliver = (purchase: Purchase) => {
    const token = purchase.purchaseToken;
    const productId = purchase.productId;
    if (!token || !productId || delivered.current.has(token)) return;
    delivered.current.add(token);
    void confirmRef
      .current(productId, token)
      .then(() => finishRef.current?.(purchase, productId === PRODUCTS.day.id))
      .catch((e) => setError(errorMessage(ui, e)))
      .finally(() => setBusy(null));
  };

  const { connected, products, subscriptions, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: deliver,
    onPurchaseError: (purchaseError) => {
      if (purchaseError.code !== ErrorCode.UserCancelled) {
        setError(purchaseError.message || t(ui, 'errorGeneric'));
      }
      setBusy(null);
    },
  });
  finishRef.current = (purchase, consumable) => finishTransaction({ purchase, isConsumable: consumable });

  useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: [PRODUCTS.day.id], type: 'in-app' });
    void fetchProducts({
      skus: [PRODUCTS.week.id, PRODUCTS.month.id, PRODUCTS.year.id],
      type: 'subs',
    });
  }, [connected, fetchProducts]);

  const buy = async (plan: PaidPlan) => {
    const product = PRODUCTS[plan];
    setBusy(plan);
    setError(null);
    try {
      if (product.kind === 'in-app') {
        const result = await requestPurchase({ type: 'in-app', request: { google: { skus: [product.id] } } });
        const list = Array.isArray(result) ? result : result ? [result] : [];
        list.forEach(deliver);
        return;
      }
      const token = offerToken(subscriptions, product.id);
      if (!token) {
        setError(t(ui, 'billingUnavailable'));
        setBusy(null);
        return;
      }
      const result = await requestPurchase({
        type: 'subs',
        request: { google: { skus: [product.id], subscriptionOffers: [{ sku: product.id, offerToken: token }] } },
      });
      const list = Array.isArray(result) ? result : result ? [result] : [];
      list.forEach(deliver);
    } catch (e) {
      if (!(e instanceof ApiError)) setError(errorMessage(ui, e));
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    setError(null);
    try {
      const purchases = await getAvailablePurchases();
      const known: string[] = Object.values(PRODUCTS).map((product) => product.id);
      for (const purchase of purchases) {
        if (!purchase.purchaseToken || !known.includes(purchase.productId)) continue;
        await confirmPurchase(purchase.productId, purchase.purchaseToken);
      }
    } catch (e) {
      setError(errorMessage(ui, e));
    } finally {
      setBusy(null);
    }
  };

  const until = profile.planExpiresAt?.slice(0, 10);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t(ui, 'yourPlan'), headerShown: true }} />
      <Title>{t(ui, 'yourPlan')}</Title>
      {profile.plan !== 'free' && until ? <Muted>{t(ui, 'planActive', { date: until })}</Muted> : null}
      {(Object.keys(PRODUCTS) as PaidPlan[]).map((plan) => {
        const product = PRODUCTS[plan];
        const current = profile.plan === plan;
        const price = priceFor(products, subscriptions, product.id);
        return (
          <Card key={plan}>
            <Body>{t(ui, product.title)}</Body>
            <Muted>{t(ui, product.body)}</Muted>
            <Button
              label={current ? t(ui, 'saved') : price ?? t(ui, 'startPlan')}
              onPress={() => buy(plan)}
              disabled={current || !connected}
              loading={busy === plan}
            />
          </Card>
        );
      })}
      <Button
        variant="secondary"
        label={t(ui, 'restorePurchases')}
        onPress={restore}
        loading={busy === 'restore'}
      />
      <ErrorText message={error} />
    </Screen>
  );
}
