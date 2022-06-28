import { reactive } from 'vue';

export const chiaState = reactive<{ activeFingerprint: string | undefined }>({ activeFingerprint: undefined });
