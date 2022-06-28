<script setup lang="ts">
import { IpcService } from '../helpers/ipc-service';
import { ref } from 'vue';

const connectionInProgress = ref(true);
const connectionError = ref<any>(undefined);

const ipc = new IpcService();
const init = async () => {
  try {
    await ipc.send('get_public_keys');
  } catch (e) {
    connectionError.value = e;
  }
  connectionInProgress.value = false;
};
init();
</script>
<template>
  <div class="p-8 w-full max-w-xl xl:max-w-7xl space-y-8">
    <div>
      <h3 class="text-3xl leading-6 font-medium text-gray-900">Set up</h3>
    </div>
    <div v-if="connectionError" class="flex flex-col gap-4">
      <p>Failed to connect to your Chia wallet: {{ connectionError }}</p>
      <p>Please make sure the wallet is running and the CHIA_ROOT is set correctly, then restart this application.</p>
    </div>
  </div>
</template>
