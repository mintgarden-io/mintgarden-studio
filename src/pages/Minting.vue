<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from '@headlessui/vue';
import { CheckIcon, SelectorIcon, XCircleIcon } from '@heroicons/vue/solid';
import { toSvg } from 'jdenticon';
import DropZone from '../components/DropZone.vue';
import { IpcService } from '../helpers/ipc-service';
import { NftStorageUploader } from '../helpers/nft-storage';
import { chiaState } from '../state/chia';
import { Collection, store } from '../state/store';
import { watchDebounced } from '@vueuse/core';
import { openNftOnMintGarden } from '../helpers/open-external';

const ipc = new IpcService();

const isTestnet = chiaState.networkName !== 'mainnet';

const initialMetadata = {
  format: 'CHIP-0007',
  minting_tool: 'mintgarden-studio',
  sensitive_content: false,
  name: '',
  description: '',
  attributes: [],
};
const initialOnChainMetadata = {
  royaltyPercentage: 0,
  targetAddress: undefined,
  royaltyAddress: undefined,
  licenseUrl: undefined,
  licenseHash: undefined,
};

const currentFile = ref<any>(undefined);
const metadata = reactive(JSON.parse(JSON.stringify(initialMetadata)));
const onChainMetadata = reactive<{
  royaltyPercentage: number;
  targetAddress?: string;
  royaltyAddress?: string;
  licenseUrl?: string;
  licenseHash?: string;
}>({ ...initialOnChainMetadata });
const blockchainFee = ref(0);
const confirmLegal = ref(false);

const dropzone = ref();
const container = ref();

const isHovering = ref(false);
const dids = ref([]);
const selectedDid = ref<any>(undefined);
const collections = Object.values(store.get('collections'));
const selectedCollection = ref<Collection | undefined>(undefined);

type MintingStage = 'preparing' | 'uploading' | 'minting' | 'pending' | 'done';
const progress = ref<undefined | MintingStage | 'error'>(undefined);
const someError = ref<{ stage: MintingStage; error: any } | undefined>(undefined);
const nft = ref<{ id: string; encodedId: string } | undefined>(undefined);

const getDids = async () => {
  const response = await ipc.send<any>('get_dids');
  console.log(response);
  for (const did of response.dids) {
    did.avatar = toSvg(did.didId, 24);
  }
  dids.value = response.dids;
  selectedDid.value = dids.value[0];
};
getDids();

watch(
  () => ({ ...chiaState }),
  (value, oldValue) => {
    console.log(oldValue, value);
    if (oldValue.activeFingerprint !== value.activeFingerprint) {
      getDids();
    }
    if (!oldValue.synced && value.synced) {
      getDids();
    }
  }
);

const licenseFromCollection = ref(false);
watch(selectedCollection, (value) => {
  if (value?.licenseUrl && value?.licenseHash) {
    onChainMetadata.licenseUrl = value.licenseUrl;
    onChainMetadata.licenseHash = value.licenseHash;
    licenseFromCollection.value = true;
  } else {
    onChainMetadata.licenseUrl = undefined;
    onChainMetadata.licenseHash = undefined;
    licenseFromCollection.value = false;
  }
});

const licenseError = ref<string | undefined>(undefined);
watchDebounced(
  () => onChainMetadata.licenseUrl,
  async (licenseUrl) => {
    if (licenseFromCollection.value) {
      return;
    }

    if (licenseUrl && licenseUrl.startsWith('http')) {
      try {
        const { licenseHash } = await ipc.send('fetch_license', { licenseUrl });
        onChainMetadata.licenseHash = licenseHash;
        licenseError.value = undefined;
        return;
      } catch (error: any) {
        licenseError.value = error.error?.message;
      }
    } else {
      licenseError.value = undefined;
    }
    onChainMetadata.licenseHash = undefined;
  },
  { debounce: 500 }
);

const clearNftDetails = () => {
  currentFile.value = undefined;
  progress.value = undefined;
  someError.value = undefined;
  confirmLegal.value = false;
  metadata.name = '';
  metadata.description = '';
  metadata.attributes = [];
  nft.value = undefined;
};

const clearForm = () => {
  clearNftDetails();
  selectedCollection.value = undefined;
  Object.assign(metadata, JSON.parse(JSON.stringify(initialMetadata)));
  Object.assign(onChainMetadata, initialOnChainMetadata);
};

const isMintingEnabled = computed(() => {
  return confirmLegal.value && (!progress.value || progress.value === 'done' || someError.value);
});

const setAttributeValue = (name: string, e) => {
  const value = e.target.value;

  const existingAttributeIndex = metadata.attributes.findIndex((attribute: any) => attribute.name === name);
  if (existingAttributeIndex >= 0) {
    if (value) {
      metadata.attributes[existingAttributeIndex].value = value;
    } else {
      metadata.attributes.splice(existingAttributeIndex, 1);
    }
  } else {
    metadata.attributes.push({ name, value: e.target.value });
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    container.value.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'start' });
  });
};

const uploadAndMint = async () => {
  if (!isMintingEnabled.value) {
    return;
  }

  try {
    nft.value = undefined;
    progress.value = 'preparing';
    someError.value = undefined;
    scrollToBottom();

    if (!currentFile.value) {
      someError.value = { stage: 'preparing', error: new Error('No image selected.') };
      scrollToBottom();
      return;
    }

    if (!chiaState.synced) {
      someError.value = { stage: 'preparing', error: new Error('Wallet is not synced.') };
      scrollToBottom();
      return;
    }

    if (!selectedDid.value) {
      someError.value = { stage: 'preparing', error: new Error('No DID selected.') };
      scrollToBottom();
      return;
    }

    const urisAndHashes = await uploadToNftStorage();
    scrollToBottom();

    try {
      nft.value = await mintNft(urisAndHashes);
      await pollForMintingStatus();
    } catch (mintingError) {
      someError.value = { stage: 'minting', error: mintingError?.error || mintingError };
    }
  } catch (uploadError) {
    someError.value = { stage: 'uploading', error: uploadError };
  }
  scrollToBottom();
};

const uploadToNftStorage = async () => {
  progress.value = 'uploading';
  const metadataToUpload: any = { ...metadata, description: metadata.description.trim() };
  if (selectedCollection.value) {
    metadataToUpload.collection = {
      id: selectedCollection.value.id,
      name: selectedCollection.value.name,
      attributes: [],
    };
    const addAttributeIfSet = (type: string, value: string | undefined) => {
      if (value) {
        metadataToUpload.collection.attributes.push({
          type,
          value,
        });
      }
    };
    addAttributeIfSet('description', selectedCollection.value.description);
    addAttributeIfSet('icon', selectedCollection.value.iconUrl);
    addAttributeIfSet('banner', selectedCollection.value.bannerUrl);
    addAttributeIfSet('twitter', selectedCollection.value.twitterHandle);
    addAttributeIfSet('website', selectedCollection.value.website);
  }

  const nftStorageUploader = new NftStorageUploader();
  return await nftStorageUploader.upload(currentFile.value, metadataToUpload);
};

const mintNft = async (urisAndHashes: any): Promise<any> => {
  progress.value = 'minting';
  return await ipc.send('mint_nft', {
    ...urisAndHashes,
    ...onChainMetadata,
    did: { ...selectedDid.value },
    feeInXch: blockchainFee.value,
  });
};

let pollForMintingStatusInterval: NodeJS.Timer | undefined = undefined;
let nftStatusPollCounter = ref(0);
const pollForMintingStatus = async (): Promise<any> => {
  progress.value = 'pending';
  nftStatusPollCounter.value = 0;

  const polling = async () => {
    const data = await ipc.send<any>('get_nft_mint_status', {
      nftId: nft.value?.id,
    });
    nftStatusPollCounter.value += 1;
    if (data?.transaction?.confirmed) {
      progress.value = 'done';
      clearInterval(pollForMintingStatusInterval);
    } else if (nftStatusPollCounter.value > 120 / 5) {
      progress.value = 'error';
      someError.value = {
        stage: 'pending',
        error: "Couldn't detect NFT after 2 minutes of waiting. Please check an NFT explorer.",
      };
      clearInterval(pollForMintingStatusInterval);
    }
  };

  await polling();
  pollForMintingStatusInterval = setInterval(polling, 5000);
};

const getProgressWidth = () => {
  switch (progress.value) {
    case 'done':
      return '100%';
    case 'minting':
    case 'pending':
      return '62.5%';
    case 'uploading':
      return '37.5%';
    default:
      return '7%';
  }
};
const openFilePicker = () => {
  document.querySelector('#dropzoneFileLabel').click();
};
</script>
<template>
  <form ref="container" class="p-8 w-full max-w-2xl xl:max-w-7xl space-y-8" @submit.prevent="uploadAndMint">
    <div class="space-y-8 divide-y divide-gray-200">
      <div>
        <div>
          <h3 class="text-3xl leading-6 font-medium text-gray-900">Mint a single NFT</h3>
        </div>

        <div class="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="col-span-6 xl:col-span-3 space-y-6">
            <div>
              <Listbox as="div" v-model="selectedDid" :disabled="dids.length === 0">
                <ListboxLabel class="block text-sm font-medium text-gray-700"> Creator</ListboxLabel>
                <div class="mt-1 relative">
                  <ListboxButton
                    class="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  >
                    <span v-if="selectedDid" class="flex items-center">
                      <span v-if="selectedDid.avatar" v-html="selectedDid.avatar" />
                      <span class="ml-3 block truncate">{{ selectedDid.name }}</span>
                    </span>
                    <span v-else class="flex items-center">
                      <span class="block truncate">No profile available - Create it in the Chia app</span>
                    </span>
                    <span class="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <SelectorIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </ListboxButton>

                  <transition
                    leave-active-class="transition ease-in duration-100"
                    leave-from-class="opacity-100"
                    leave-to-class="opacity-0"
                  >
                    <ListboxOptions
                      class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-56 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
                    >
                      <ListboxOption
                        as="template"
                        v-for="did in dids"
                        :key="did.id"
                        :value="did"
                        v-slot="{ active, selected }"
                      >
                        <li
                          :class="[
                            active ? 'text-white bg-emerald-600' : 'text-gray-900',
                            'cursor-default select-none relative py-2 pl-3 pr-9',
                          ]"
                        >
                          <div class="flex items-center">
                            <span v-html="did.avatar" />
                            <span :class="[selected ? 'font-semibold' : 'font-normal', 'ml-3 block truncate']">
                              {{ did.name }}
                            </span>
                          </div>

                          <span
                            v-if="selected"
                            :class="[
                              active ? 'text-white' : 'text-emerald-600',
                              'absolute inset-y-0 right-0 flex items-center pr-4',
                            ]"
                          >
                            <CheckIcon class="h-5 w-5" aria-hidden="true" />
                          </span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>
            </div>
            <div>
              <Listbox as="div" v-model="selectedCollection">
                <ListboxLabel class="block text-sm font-medium text-gray-700">Collection</ListboxLabel>
                <div class="mt-1 relative">
                  <ListboxButton
                    class="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  >
                    <span v-if="selectedCollection" class="flex items-center">
                      <img
                        v-if="selectedCollection.iconUrl"
                        class="h-6 w-6 rounded-full"
                        :src="selectedCollection.iconUrl"
                      />
                      <span :class="selectedCollection.iconUrl ? 'ml-3' : ''" class="block truncate">{{
                        selectedCollection.name
                      }}</span>
                    </span>
                    <span v-else class="flex items-center">
                      <span class="block truncate">No Collection</span>
                    </span>
                    <span class="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <SelectorIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </ListboxButton>

                  <transition
                    leave-active-class="transition ease-in duration-100"
                    leave-from-class="opacity-100"
                    leave-to-class="opacity-0"
                  >
                    <ListboxOptions
                      class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-56 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
                    >
                      <ListboxOption as="template" key="none" :value="undefined" v-slot="{ active, selected }">
                        <li
                          :class="[
                            active ? 'text-white bg-emerald-600' : 'text-gray-900',
                            'cursor-default select-none relative py-2 pl-3 pr-9',
                          ]"
                        >
                          <div class="flex items-center">
                            <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                              No Collection
                            </span>
                          </div>

                          <span
                            v-if="selected"
                            :class="[
                              active ? 'text-white' : 'text-emerald-600',
                              'absolute inset-y-0 right-0 flex items-center pr-4',
                            ]"
                          >
                            <CheckIcon class="h-5 w-5" aria-hidden="true" />
                          </span>
                        </li>
                      </ListboxOption>
                      <ListboxOption
                        as="template"
                        v-for="collection in collections"
                        :key="collection.id"
                        :value="collection"
                        v-slot="{ active, selected }"
                      >
                        <li
                          :class="[
                            active ? 'text-white bg-emerald-600' : 'text-gray-900',
                            'cursor-default select-none relative py-2 pl-3 pr-9',
                          ]"
                        >
                          <div class="flex items-center">
                            <img v-if="collection.iconUrl" class="h-6 w-6 rounded-full" :src="collection.iconUrl" />
                            <span :class="[selected ? 'font-semibold' : 'font-normal', 'ml-3 block truncate']">
                              {{ collection.name }}
                            </span>
                          </div>

                          <span
                            v-if="selected"
                            :class="[
                              active ? 'text-white' : 'text-emerald-600',
                              'absolute inset-y-0 right-0 flex items-center pr-4',
                            ]"
                          >
                            <CheckIcon class="h-5 w-5" aria-hidden="true" />
                          </span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </div>
              </Listbox>
            </div>
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700"> Name </label>
              <div class="mt-1">
                <input
                  type="text"
                  v-model="metadata.name"
                  name="name"
                  id="name"
                  autocomplete="name"
                  class="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
            </div>

            <div>
              <label for="description" class="block text-sm font-medium text-gray-700"> Description </label>
              <div class="mt-1">
                <textarea
                  v-model="metadata.description"
                  id="description"
                  name="description"
                  rows="5"
                  class="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label for="website" class="block text-sm font-medium text-gray-700"> License URL </label>
              <div class="mt-1">
                <input
                  type="text"
                  v-model="onChainMetadata.licenseUrl"
                  name="licenseUrl"
                  id="licenseUrl"
                  autocomplete="licenseUrl"
                  :disabled="licenseFromCollection"
                  :class="licenseFromCollection ? 'cursor-not-allowed bg-gray-100' : ''"
                  class="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
              <p v-if="licenseError" class="mt-2 text-sm text-red-600" id="license-error">{{ licenseError }}</p>
            </div>
            <div>
              <label for="website" class="block text-sm font-medium text-gray-700"> License Hash </label>
              <div class="mt-1">
                <input
                  type="text"
                  disabled
                  v-model="onChainMetadata.licenseHash"
                  name="licenseHash"
                  id="licenseHash"
                  autocomplete="licenseHash"
                  placeholder="Will be calculated automatically"
                  class="shadow-sm cursor-not-allowed bg-gray-100 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
            </div>

            <div v-if="selectedCollection && selectedCollection.attributes?.length > 0">
              <label for="company-website" class="block text-sm font-medium text-gray-700">Attributes</label>
              <div class="mt-1 flex flex-col gap-2">
                <div v-for="attribute in selectedCollection.attributes" class="flex rounded-md shadow-sm">
                  <span
                    class="min-w-[8rem] inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
                  >
                    {{ attribute.name }}
                  </span>
                  <input
                    type="text"
                    @change="setAttributeValue(attribute.name, $event)"
                    :name="`${attribute.name}-value`"
                    :id="`${attribute.name}-value`"
                    class="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm border-gray-300"
                  />
                </div>
              </div>
            </div>

            <div>
              <label for="name" class="block text-sm font-medium text-gray-700"> Royalty percentage </label>
              <div class="relative mt-1">
                <div
                  class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none sm:text-sm border-gray-300 text-gray-500"
                >
                  %
                </div>
                <input
                  type="number"
                  step="any"
                  v-model="onChainMetadata.royaltyPercentage"
                  name="royaltyPercentage"
                  id="royaltyPercentage"
                  min="0"
                  max="100"
                  class="pl-10 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
            </div>
          </div>

          <div class="col-span-6 xl:col-span-3 space-y-6">
            <div>
              <label for="image" class="block text-sm font-medium text-gray-700"> Image </label>
              <div
                v-if="currentFile"
                :class="[
                  isHovering ? 'border-emerald-500' : 'border-gray-300',
                  'cursor-pointer mt-1 flex justify-center border-2 rounded-md',
                ]"
              >
                <img @click="openFilePicker()" :src="currentFile.objectUrl" class="" />
              </div>
              <div :class="currentFile ? 'hidden' : ''">
                <DropZone ref="dropzone" v-model="currentFile" accept="image/*" />
              </div>
              <div v-if="currentFile" class="flex-grow flex justify-end items-center space-x-4">
                <button
                  @click="currentFile = undefined"
                  type="button"
                  class="bg-white rounded-md text-sm text-emerald-600 hover:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Remove
                </button>
              </div>
            </div>
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700"> Blockchain fee </label>
              <div class="relative mt-1">
                <input
                  type="number"
                  step="any"
                  v-model="blockchainFee"
                  name="blockchainFee"
                  id="blockchainFee"
                  min="0"
                  max="0.1"
                  class="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span class="text-gray-500 sm:text-sm" id="price-currency"> {{ isTestnet ? 'TXCH' : 'XCH' }} </span>
                </div>
              </div>
              <p class="mt-2 text-sm text-gray-500">
                Use {{ 615_000_000 / 10 ** 12 }} if mempool is full, 0 otherwise.
              </p>
            </div>
          </div>
          <div class="col-span-6">
            <div>
              <div class="relative flex items-start">
                <div class="flex items-center h-5">
                  <input
                    id="confirmLegal"
                    v-model="confirmLegal"
                    required
                    name="confirmLegal"
                    type="checkbox"
                    class="focus:ring-emerald-500 h-4 w-4 text-emerald-600 border-gray-300 rounded"
                  />
                </div>
                <div class="ml-3 text-sm">
                  <label for="confirmLegal" class="font-medium text-gray-700"
                    >I confirm that I have the necessary legal rights to reference this data in an NFT.</label
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="pt-5">
      <div class="flex justify-end">
        <button
          type="button"
          @click="clearForm()"
          class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Clear Everything
        </button>
        <button
          type="submit"
          :class="isMintingEnabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-500'"
          class="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <svg
            v-if="progress && progress !== 'done' && !someError"
            class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Mint
        </button>
      </div>
    </div>
    <div v-if="progress">
      <h4 class="sr-only">Status</h4>
      <p class="text-sm font-medium text-gray-900">
        <span v-if="progress !== 'done'">Minting your NFT...</span><span v-else>Your NFT has been minted!</span>
      </p>
      <p
        v-if="progress === 'pending' || progress === 'done'"
        class="mt-1 text-sm text-gray-600 overflow-hidden overflow-ellipsis"
      >
        <span v-if="progress === 'pending'"
          >The transaction has been submitted, it will take a minute to be confirmed on the blockchain.
        </span>
        <span v-else
          >You can find it here:
          <a class="font-semibold text-emerald-600" href="#" @click.prevent="openNftOnMintGarden(nft)"
            >https://{{ isTestnet ? 'testnet.' : '' }}mintgarden.io/nfts{{ nft ? `/${nft.encodedId}` : '' }}</a
          ></span
        >
      </p>
      <div class="mt-6" aria-hidden="true">
        <div class="bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-2 rounded-full"
            :class="someError ? 'bg-red-600' : 'bg-emerald-600'"
            :style="{ width: getProgressWidth() }"
          />
        </div>
        <div class="hidden sm:grid grid-cols-4 text-sm font-medium text-gray-600 mt-6">
          <div :class="someError?.stage === 'preparing' ? 'text-red-600' : 'text-emerald-600'">Preparing Metadata</div>
          <div
            class="text-center"
            :class="
              someError?.stage === 'uploading' ? 'text-red-600' : progress !== 'preparing' ? 'text-emerald-600' : ''
            "
          >
            Uploading files
          </div>
          <div
            class="text-center"
            :class="
              someError?.stage === 'minting' || someError?.stage === 'pending'
                ? 'text-red-600'
                : progress === 'minting' || progress === 'pending' || progress === 'done'
                ? 'text-emerald-600'
                : ''
            "
          >
            Minting NFT
          </div>
          <div class="text-right" :class="progress === 'done' ? 'text-emerald-600' : ''">Finished</div>
        </div>
      </div>
      <div v-if="someError" class="mt-6">
        <div class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <XCircleIcon class="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Failed to mint your NFT</h3>
              <div class="mt-2 text-sm text-red-700">
                {{ someError.error }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </form>
</template>

<style>
input[type='number']::-webkit-outer-spin-button,
input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type='number'] {
  -moz-appearance: textfield;
}
</style>
