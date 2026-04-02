export const initCrazyGames = async () => {
  const cg = (window as any).CrazyGames;
  if (cg && cg.SDK) {
    try {
      if (typeof cg.SDK.init === 'function') {
        await Promise.race([
          cg.SDK.init(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Init timeout')), 500))
        ]);
      }
      if (cg.SDK.game && cg.SDK.game.sdkGameLoading) {
        cg.SDK.game.sdkGameLoading();
      }
      if (cg.SDK.game && cg.SDK.game.sdkGameReady) {
        cg.SDK.game.sdkGameReady();
      }
    } catch (e) {
      console.warn("CrazyGames init error", e);
    }
  }
};

export const saveToCrazyGames = async (key: string, value: any) => {
  const strValue = JSON.stringify(value);
  try {
    localStorage.setItem(key, strValue);
  } catch (e) {
    console.warn("LocalStorage save error", e);
  }
  const cg = (window as any).CrazyGames;
  if (cg && cg.SDK && cg.SDK.data) {
    try {
      await cg.SDK.data.setItem(key, strValue);
    } catch (e) {
      console.warn("CrazyGames save error", e);
    }
  }
};

export const loadFromCrazyGames = async (key: string, defaultValue: any) => {
  let val: string | null = null;
  try {
    val = localStorage.getItem(key);
  } catch (e) {
    console.warn("LocalStorage load error", e);
  }
  const cg = (window as any).CrazyGames;
  if (cg && cg.SDK && cg.SDK.data) {
    try {
      const cgVal = await Promise.race([
        cg.SDK.data.getItem(key),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 500))
      ]);
      if (cgVal !== null && cgVal !== undefined) {
        val = cgVal;
      }
    } catch (e) {
      console.warn("CrazyGames load error", e);
    }
  }
  if (val !== null && val !== undefined) {
    try {
      return JSON.parse(val);
    } catch (e) {
      return val;
    }
  }
  return defaultValue;
};
