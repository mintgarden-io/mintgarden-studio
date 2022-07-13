import { reactive } from 'vue';

export const chiaState = reactive<{
  activeFingerprint: string | undefined;
  synced: boolean;
  syncing: boolean;
}>({ activeFingerprint: undefined, synced: false, syncing: false });
