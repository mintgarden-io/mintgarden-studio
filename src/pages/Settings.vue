<script setup lang="ts">
import { IpcService } from '../helpers/ipc-service';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const ipc = new IpcService();

const chiaRoot = ref<string | undefined>(undefined);
const connectionError = ref<any>(undefined);
const storageOptions = ref<{ hide: boolean }>({ hide: false });
const storageToken = ref<string | undefined>(undefined);


const init = async () => {
  connectionError.value = undefined;
  chiaRoot.value = undefined;
  try {
    const response = await ipc.send<{ chiaRoot: string }>('get_chia_root');
    chiaRoot.value = response.chiaRoot;

    const storageTokenResponse = await ipc.send<{ storageToken: string }>('get_storage_token');
    storageToken.value = storageTokenResponse.storageToken;

  } catch (e: any) {
    connectionError.value = e;
    chiaRoot.value = e.data.chiaRoot;

    storageOptions.value = e.data.storageOptions;
    storageToken.value = e.data.storageToken;
  }
};
init();

const setChiaRoot = async (event: any) => {
  event.preventDefault();
  await ipc.send('set_chia_root', { chiaRoot: chiaRoot.value });
  await init();
};

const setStorageToken = async (event: any) => {
  event.preventDefault();
  await ipc.send('set_storage_token', { storageToken: storageToken.value });
  await init();
};

</script>

<template>
  <div class="p-8 w-full max-w-xl xl:max-w-7xl space-y-8">
    <div>
      <h3 class="text-3xl leading-6 font-medium text-gray-900">Settings</h3>
    </div>
    <div v-if="connectionError" class="flex flex-col gap-4">
      <p>Failed to connect to your Chia wallet: {{ connectionError }}</p>
      <p>Please make sure the wallet is running and the CHIA_ROOT is set correctly, then restart this application.</p>
    </div>
    <form class="flex flex-col gap-4" @submit="setChiaRoot">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700"> Current Chia Root </label>
        <div class="mt-1">
          <input type="text" v-model="chiaRoot" name="name" id="name" autocomplete="name"
            class="shadow-sm focus:ring-gray-500 focus:border-gray-500 block w-full rounded-md sm:text-sm border-gray-300" />
        </div>
      </div>
      <div>
        <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700">
          Update Chia Root
        </button>
      </div>
    </form>
    <form class="flex flex-col gap-4" @submit="setStorageToken">
      <div>
        <label for="storageToken" class="block text-sm font-medium text-gray-700"> NFT Storage Token </label>
        <div>
          <input type="password" v-model="storageToken" name="storageToken" id="storageToken" autocomplete="off"
          class="shadow-sm focus:ring-gray-500 focus:border-gray-500 block w-full rounded-md sm:text-sm border-gray-300" />
        </div>
      </div>
      <div>
        <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700">
          Update Storage Token
        </button>
      </div>
      <p>
        Please log in to your <a href="https://nft.storage/manage/" class="inline-flex justify-center py-1 px-2 shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700">NFT.Storage</a> account and copy your API key to use the upload service.
      </p> 
    </form>
  </div>
</template>