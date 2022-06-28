import { reactive } from 'vue';

export const chiaState = reactive<{
  activeFingerprint: string | undefined;
  syncStatus:
    | {
        synced: boolean;
        syncing: boolean;
      }
    | undefined;
}>({ activeFingerprint: undefined, syncStatus: undefined });
