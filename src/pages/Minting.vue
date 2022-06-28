<script setup lang="ts">
import { reactive, ref } from 'vue';
import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from '@headlessui/vue';
import { CheckIcon, SelectorIcon } from '@heroicons/vue/solid';
import { toSvg } from 'jdenticon';
import DropZone from '../components/DropZone.vue';
import * as fs from 'fs';
import { File } from 'nft.storage';
import { IpcService } from '../helpers/ipc-service';
import { NftStorageUploader } from '../helpers/nft-storage';

const ipc = new IpcService();

const currentFile = ref<any>(undefined);
const metadata = reactive({ name: '', description: '' });

const isHovering = ref(false);
const dids = ref([]);
const selected = ref<any>(undefined);
const progress = ref<undefined | 'uploading' | 'minting' | 'done'>(undefined);

const getDids = async () => {
  const response = await ipc.send<any>('get_dids');
  for (const did of response.dids) {
    did.avatar = toSvg(did.id, 24);
  }
  dids.value = response.dids;
  selected.value = dids.value[0];
};
getDids();

const drop = async (e: any) => {
  const file = e.dataTransfer.files[0];
  loadFile(file.path);
};
const selectedFile = async () => {
  const file = (document.querySelector('#dropzoneFile') as any).files[0];
  loadFile(file);
};

const loadFile = (file: File) => {
  // TODO ensure that file.size is not too large?

  const blob = fs.readFileSync(file.path);

  currentFile.value = {
    name: file.name,
    type: file.type,
    content: blob,
    objectUrl: URL.createObjectURL(new Blob([blob])),
  };
};

const reset = () => {
  currentFile.value = undefined;
  progress.value = undefined;
};

const uploadAndMint = async (e: any) => {
  e.preventDefault();
  const data = await uploadToNftStorage();
  await mintNft(data);
};

const uploadToNftStorage = async () => {
  progress.value = 'uploading';
  metadata.description = metadata.description.trim();

  const nftStorageUploader = new NftStorageUploader();
  return await nftStorageUploader.upload(currentFile.value, metadata);
};

const mintNft = async (data: any) => {
  progress.value = 'minting';
  await ipc.send('mint_nft', { ...data, did: selected?.id });
  progress.value = 'done';
};

const getProgressWidth = () => {
  switch (progress.value) {
    case 'done':
      return '100%';
    case 'minting':
      return '62.5%';
    case 'uploading':
      return '37.5%';
    default:
      return '7%';
  }
};
</script>
<template>
  <form class="p-8 w-full max-w-xl xl:max-w-7xl space-y-8" @submit="uploadAndMint">
    <div class="space-y-8 divide-y divide-gray-200">
      <div>
        <div>
          <h3 class="text-3xl leading-6 font-medium text-gray-900">Mint a single NFT</h3>
        </div>

        <div class="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="col-span-6 xl:col-span-3 space-y-6">
            <div>
              <Listbox as="div" v-model="selected">
                <ListboxLabel class="block text-sm font-medium text-gray-700"> Creator</ListboxLabel>
                <div class="mt-1 relative">
                  <ListboxButton
                    class="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  >
                    <span v-if="selected" class="flex items-center">
                      <span v-html="selected.avatar" />
                      <span class="ml-3 block truncate">{{ selected.name }}</span>
                    </span>
                    <span v-else class="flex items-center">
                      <img src="" alt="" class="flex-shrink-0 h-6 w-6 rounded-full" />
                      <span class="ml-3 block truncate">Create new DID...</span>
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
              <label for="name" class="block text-sm font-medium text-gray-700"> Royalty percentage </label>
              <div class="mt-1">
                <input
                  type="number"
                  v-model="metadata.royalty_percentage"
                  name="royalty_percentage"
                  id="royalty_percentage"
                  min="0"
                  max="100"
                  class="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
            </div>
          </div>

          <div class="col-span-6 xl:col-span-3">
            <label for="image" class="block text-sm font-medium text-gray-700"> Image </label>
            <div
              v-if="currentFile"
              :class="[
                isHovering ? 'border-emerald-500' : 'border-gray-300',
                'cursor-pointer mt-1 flex justify-center border-2 rounded-md',
              ]"
            >
              <img :src="currentFile.objectUrl" class="" />
            </div>
            <div v-else>
              <DropZone @drop.prevent="drop" @change="selectedFile" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="pt-5">
      <div class="flex justify-end">
        <button
          type="button"
          @click="reset()"
          class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Reset
        </button>
        <button
          type="submit"
          :disabled="progress"
          class="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <svg
            v-if="progress && progress !== 'done'"
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
        <span v-if="progress !== 'done'">Minting your NFT...</span><span v-else>Your NFT has been submitted!</span>
      </p>
      <div class="mt-6" aria-hidden="true">
        <div class="bg-gray-200 rounded-full overflow-hidden">
          <div class="h-2 bg-emerald-600 rounded-full" :style="{ width: getProgressWidth() }" />
        </div>
        <div class="hidden sm:grid grid-cols-4 text-sm font-medium text-gray-600 mt-6">
          <div class="text-emerald-600">Preparing Metadata</div>
          <div class="text-center text-emerald-600">Uploading files</div>
          <div class="text-center" :class="progress === 'minting' || progress === 'done' ? 'text-emerald-600' : ''">
            Minting NFT
          </div>
          <div class="text-right" :class="progress === 'done' ? 'text-emerald-600' : ''">Finished</div>
        </div>
      </div>
    </div>
  </form>
</template>
