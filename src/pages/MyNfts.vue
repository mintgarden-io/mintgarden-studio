<script setup lang="ts">
import { ViewGridIcon, SparklesIcon } from '@heroicons/vue/outline';
import { IpcService } from '../helpers/ipc-service';
import { ref, watch } from 'vue';
import { openNftOnMintGarden } from '../helpers/open-external';
import { chiaState } from '../state/chia';

const ipc = new IpcService();

const nfts = ref<any[]>([]);
const getNfts = async () => {
  const { dids } = await ipc.send<any>('get_dids');

  const myNfts = [];
  for (const did of dids) {
    const isTestnet = chiaState.networkName !== 'mainnet';
    const { nfts: newNfts } = await ipc.send<any>('get_nfts_for_did', { did: did.didId, isTestnet });
    if (newNfts) {
      myNfts.push(...newNfts);
    }
  }
  nfts.value = myNfts;
};
getNfts();

watch(
  () => ({ ...chiaState }),
  (value, oldValue) => {
    if (oldValue.activeFingerprint !== value.activeFingerprint) {
      getNfts();
    }
    if (!oldValue.synced && value.synced) {
      getNfts();
    }
  }
);
</script>
<template>
  <div class="p-8 w-full xl:max-w-7xl space-y-8">
    <div>
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-3xl leading-6 font-medium text-gray-900">My NFTs</h1>
        </div>
      </div>
      <div class="mt-8 flex flex-col">
        <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div v-if="nfts?.length > 0" class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table class="min-w-full divide-y divide-gray-300">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      NFT
                    </th>
                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Description</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                  <template v-for="nft in nfts" :key="nft.id">
                    <tr @click.prevent="openNftOnMintGarden(nft)" class="cursor-pointer hover:bg-emerald-50">
                      <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div class="flex items-center">
                          <div class="h-10 w-10 flex-shrink-0 flex items-center justify-center">
                            <img
                              v-if="nft.thumbnail_uri"
                              class="h-10 w-10 rounded-md"
                              :src="nft.thumbnail_uri"
                              alt=""
                            />
                            <ViewGridIcon v-else class="h-6 w-6 text-gray-500" alt="" />
                          </div>
                          <div class="ml-4">
                            <div class="font-medium text-gray-900">
                              {{ nft.name || 'Unnamed' }}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="px-3 py-4 text-sm text-gray-500">
                        <div class="text-gray-900">{{ nft.description }}</div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
            <div v-else>
              <div class="text-center">
                <ViewGridIcon
                  class="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                />

                <h3 class="mt-2 text-sm font-medium text-gray-900">No NFTs</h3>
                <p class="mt-1 text-sm text-gray-500">Get started by creating a new NFT.</p>
                <div class="mt-6">
                  <router-link
                    to="/minting"
                    type="button"
                    class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    <SparklesIcon class="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Mint NFT
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
