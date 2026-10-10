import Constants from 'expo-constants';
import { Platform } from 'react-native';

const INTERSTITIAL_UNIT = Platform.select({
  ios: 'ca-app-pub-3940256099942544/4411468910',
  default: 'ca-app-pub-7985253532835776/3533072315',
});

const REWARDED_UNIT = Platform.select({
  ios: 'ca-app-pub-3940256099942544/1712485313',
  default: 'ca-app-pub-7985253532835776/9866457087',
});

type AdsModule = typeof import('react-native-google-mobile-ads');

function loadAds(): AdsModule | null {
  if (Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient') return null;
  try {
    return require('react-native-google-mobile-ads') as AdsModule;
  } catch {
    return null;
  }
}

let ready: Promise<void> | null = null;

function prepare(ads: AdsModule): Promise<void> {
  ready ??= (async () => {
    await ads.AdsConsent.gatherConsent();
    await ads.default().initialize();
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

/** Full-screen ad after a free lesson. Skipped when ads are unavailable. */
export async function showLessonAd(): Promise<void> {
  const ads = loadAds();
  if (!ads || !INTERSTITIAL_UNIT) return;
  try {
    await prepare(ads);
    const ad = ads.InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT);
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        resolve();
      };
      const timer = setTimeout(finish, 12000);
      const unsubscribers = [
        ad.addAdEventListener(ads.AdEventType.LOADED, () => {
          ad.show().catch(finish);
        }),
        ad.addAdEventListener(ads.AdEventType.CLOSED, finish),
        ad.addAdEventListener(ads.AdEventType.ERROR, finish),
      ];
      ad.load();
    });
  } catch {
    // A missing ad should not block the end of the lesson.
  }
}

/** Rewarded video. Resolves true only after the learner earns the reward. */
export async function showRewardedAd(): Promise<boolean> {
  const ads = loadAds();
  if (!ads || !REWARDED_UNIT) return false;
  try {
    await prepare(ads);
    const ad = ads.RewardedAd.createForAdRequest(REWARDED_UNIT);
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      let earned = false;
      const finish = (rewarded: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        resolve(rewarded);
      };
      const timer = setTimeout(() => finish(false), 20000);
      const unsubscribers = [
        ad.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
          ad.show().catch(() => finish(false));
        }),
        ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        }),
        ad.addAdEventListener(ads.AdEventType.CLOSED, () => finish(earned)),
        ad.addAdEventListener(ads.AdEventType.ERROR, () => finish(false)),
      ];
      ad.load();
    });
  } catch {
    return false;
  }
}
