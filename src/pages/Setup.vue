<script setup lang="ts">
import { IpcService } from '../helpers/ipc-service';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { XCircleIcon } from '@heroicons/vue/solid';

const router = useRouter();
const ipc = new IpcService();

const chiaRoot = ref(undefined);
const connectionError = ref<any>(undefined);

const init = async () => {
  connectionError.value = undefined;
  chiaRoot.value = undefined;
  try {
    await ipc.send('connect');
    await router.push('nfts');
  } catch (e: any) {
    if (e?.error) {
      connectionError.value = e.error;
    } else {
      connectionError.value = e;
    }
    chiaRoot.value = e.data.chiaRoot;
  }
};
init();

const setChiaRoot = async (event: any) => {
  event.preventDefault();
  await ipc.send('set_chia_root', { chiaRoot: chiaRoot.value });
  await init();
};
</script>
<template>
  <div class="p-8 w-full max-w-xl xl:max-w-7xl space-y-8">
    <div>
      <h3 class="text-3xl leading-6 font-medium text-gray-900">Set up</h3>
    </div>
    <div v-if="connectionError" class="flex flex-col gap-4">
      <div class="rounded-md bg-red-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <XCircleIcon class="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Failed to connect to your Chia wallet.</h3>
            <div class="mt-2 text-sm text-red-700">
              <p>Please make sure the wallet is running and the CHIA_ROOT is set correctly.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <form v-if="connectionError" class="flex flex-col gap-4" @submit="setChiaRoot">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700"> Current Chia Root </label>
        <div class="mt-1">
          <input
            type="text"
            v-model="chiaRoot"
            name="name"
            id="name"
            autocomplete="name"
            class="shadow-sm focus:ring-gray-500 focus:border-gray-500 block w-full rounded-md sm:text-sm border-gray-300"
          />
        </div>
      </div>
      <div>
        <button
          type="submit"
          class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
        >
          Reload
        </button>
      </div>
    </form>
  </div>
</template>
