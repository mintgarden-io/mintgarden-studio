<script setup lang="ts">
import { CollectionIcon, PlusIcon, TrashIcon } from '@heroicons/vue/outline';
import { Collection, store } from '../../state/store';
import { useRoute, useRouter } from 'vue-router';
import { reactive, ref } from 'vue';
import { CheckCircleIcon } from '@heroicons/vue/outline';
import { XIcon } from '@heroicons/vue/solid';

const showSuccessNotification = ref(false);

const route = useRoute();
const router = useRouter();
const collections = store.get('collections');

const isExisting = ref(false);

const collection = reactive<Collection>({
  id: '',
  name: '',
  description: '',
  iconUrl: '',
  bannerUrl: '',
  attributes: [],
});
if (route.params.id === 'new') {
  collection.id = crypto.randomUUID();
} else {
  let id: string;
  if (Array.isArray(route.params.id)) {
    id = route.params.id[0];
  } else {
    id = route.params.id;
  }

  const existingCollection = collections[id];
  if (existingCollection) {
    isExisting.value = true;
    Object.assign(collection, existingCollection);
  }
}

const newAttributeName = ref('');
const addAttribute = () => {
  const existingName = collection.attributes.find(({ name }) => name === newAttributeName.value);
  if (!existingName) {
    collection.attributes.push({ name: newAttributeName.value });
    newAttributeName.value = '';
  }
};

const deleteAttribute = (nameToDelete: string) => {
  const existingAttributeIndex = collection.attributes.findIndex(({ name }) => name === nameToDelete);
  if (existingAttributeIndex >= 0) {
    collection.attributes.splice(existingAttributeIndex, 1);
  }
};

const saveCollection = () => {
  collections[collection.id] = Object.assign({}, collection);
  store.set({ collections });

  isExisting.value = true;
  showSuccessNotification.value = true;
  setTimeout(() => (showSuccessNotification.value = false), 1000);
};

const deleteCollection = () => {
  delete collections[collection.id];
  store.set({ collections });
  router.push('/collections');
};
</script>
<template>
  <form ref="container" class="p-8 w-full max-w-2xl space-y-8" @submit.prevent="saveCollection">
    <div class="space-y-8 divide-y divide-gray-200">
      <div>
        <div>
          <h3 class="text-3xl leading-6 font-medium text-gray-900">{{ isExisting ? '' : 'New ' }}Collection</h3>
        </div>

        <div class="mt-6 grid grid-cols-1 gap-y-6 gap-x-4">
          <div class="col-span-6 xl:col-span-3 space-y-6">
            <div>
              <label for="id" class="block text-sm font-medium text-gray-700"> ID </label>
              <div class="mt-1">
                <input
                  type="text"
                  required
                  :disabled="isExisting"
                  v-model="collection.id"
                  name="id"
                  id="id"
                  autocomplete="id"
                  :class="isExisting ? 'cursor-not-allowed bg-gray-100' : ''"
                  class="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
            </div>
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700"> Name </label>
              <div class="mt-1">
                <input
                  type="text"
                  required
                  v-model="collection.name"
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
                  v-model="collection.description"
                  id="description"
                  name="description"
                  rows="5"
                  class="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label for="description" class="block text-sm font-medium text-gray-700"> Attributes (optional) </label>
              <div class="flex mt-3" v-for="attribute in collection.attributes">
                <div class="flex-grow">
                  <input
                    type="text"
                    :value="attribute.name"
                    disabled
                    name="attribute-name"
                    id="attribute-name"
                    class="corsor-not-allowed bg-gray-100 block w-full shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <span class="ml-3">
                  <button
                    type="button"
                    @click="deleteAttribute(attribute.name)"
                    class="bg-white inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    <TrashIcon class="-ml-2 mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </span>
              </div>
              <form class="flex mt-3" @submit.prevent="addAttribute">
                <div class="flex-grow">
                  <input
                    type="text"
                    v-model="newAttributeName"
                    name="new-attribute-name"
                    id="new-attribute-name"
                    class="block w-full shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm border-gray-300 rounded-md"
                    placeholder="Attribute name"
                  />
                </div>
                <span class="ml-3">
                  <button
                    type="submit"
                    class="bg-white inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    <PlusIcon class="-ml-2 mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                    <span>Add</span>
                  </button>
                </span>
              </form>
            </div>
            <div>
              <label for="twitterHandle" class="block text-sm font-medium text-gray-700"> Twitter Handle </label>
              <div class="mt-1 relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span class="text-gray-500 sm:text-sm">@</span>
                </div>
                <input
                  type="text"
                  v-model="collection.twitterHandle"
                  name="twitterHandle"
                  id="twitterHandle"
                  autocomplete="twitterHandle"
                  class="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-8 sm:text-sm border-gray-300 rounded-md"
                  placeholder="MintGarden_io"
                />
              </div>
            </div>
            <div>
              <label for="website" class="block text-sm font-medium text-gray-700"> Website </label>
              <div class="mt-1">
                <input
                  type="text"
                  v-model="collection.website"
                  name="website"
                  id="website"
                  autocomplete="website"
                  placeholder="https://mintgarden.io"
                  class="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
            </div>

            <div>
              <label for="iconUrl" class="block text-sm font-medium text-gray-700"> Icon URL </label>
              <div class="mt-1">
                <input
                  type="text"
                  v-model="collection.iconUrl"
                  name="iconUrl"
                  id="iconUrl"
                  autocomplete="iconUrl"
                  placeholder="https://mintgarden.io/icon.png"
                  class="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
              <div v-if="collection.iconUrl" :class="['h-48 cursor-pointer mt-1 flex justify-start rounded-md']">
                <img :src="collection.iconUrl" class="object-contain" />
              </div>
            </div>
            <div>
              <label for="bannerUrl" class="block text-sm font-medium text-gray-700"> Banner URL </label>
              <div class="mt-1">
                <input
                  type="text"
                  v-model="collection.bannerUrl"
                  name="bannerUrl"
                  id="bannerUrl"
                  autocomplete="bannerUrl"
                  placeholder="https://mintgarden.io/banner.png"
                  class="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
              <div v-if="collection.bannerUrl" :class="['h-48 cursor-pointer mt-1 flex justify-start rounded-md']">
                <img :src="collection.bannerUrl" class="object-contain" />
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
          @click="router.back()"
          class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Back
        </button>
        <button
          type="button"
          @click="deleteCollection()"
          class="ml-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Delete
        </button>
        <button
          type="submit"
          class="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Save
        </button>
      </div>
    </div>
    <!-- Global notification live region, render this permanently at the end of the document -->
    <div aria-live="assertive" class="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start">
      <div class="w-full flex flex-col items-center space-y-4 sm:items-end">
        <!-- Notification panel, dynamically insert this into the live region when it needs to be displayed -->
        <transition
          enter-active-class="transform ease-out duration-300 transition"
          enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
          enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="showSuccessNotification"
            class="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden"
          >
            <div class="p-4">
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <CheckCircleIcon class="h-6 w-6 text-green-400" aria-hidden="true" />
                </div>
                <div class="ml-3 w-0 flex-1 pt-0.5">
                  <p class="text-sm font-medium text-gray-900">Successfully saved!</p>
                  <p class="mt-1 text-sm text-gray-500">You can now use this collection.</p>
                </div>
                <div class="ml-4 flex-shrink-0 flex">
                  <button
                    type="button"
                    @click="showSuccessNotification = false"
                    class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    <span class="sr-only">Close</span>
                    <XIcon class="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </form>
</template>
