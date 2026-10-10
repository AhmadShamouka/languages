import { useState } from 'react';

import { Button, Muted } from '@/components/ui';
import { showRewardedAd } from '@/lib/ads';
import { errorMessage } from '@/lib/errors';
import { t } from '@/lib/i18n';
import { useLearner } from '@/lib/session';

/** Shown when a free learner has used today's speaking checks. */
export function WatchAdButton({ visible, onGranted }: { visible: boolean; onGranted: () => void }) {
  const { profile, ui, grantReward } = useLearner();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!visible || !profile.ads) return null;

  const watch = async () => {
    setBusy(true);
    setNote(null);
    try {
      const earned = await showRewardedAd();
      if (!earned) return;
      await grantReward();
      onGranted();
      setNote(t(ui, 'rewardThanks'));
    } catch (e) {
      setNote(errorMessage(ui, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button label={t(ui, 'watchAdForChecks')} onPress={watch} loading={busy} />
      {note ? <Muted>{note}</Muted> : null}
    </>
  );
}
