<script setup>
import { onBeforeUnmount, ref } from "vue";
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/vue";
import { CheckIcon, SelectorIcon } from "@heroicons/vue/solid";

const fileContent = ref(undefined);
const isHovering = ref(false);
const dids = ref([]);
const selected = ref(undefined);

// const loadFile = async (path) => {
//   const blob = await fs.readBinaryFile(path);
//   fileContent.value = URL.createObjectURL(new Blob([blob]));
// };
// const fileDropHover = event.listen("tauri://file-drop-hover", (e) => {
//   isHovering.value = true;
// });
//
// const fileDrop = event.listen("tauri://file-drop", (e) => {
//   isHovering.value = false;
//   if (e.payload.length > 0) {
//     loadFile(e.payload[0]);
//   }
// });
//
// const fileDropCancelled = event.listen("tauri://file-drop-cancelled", () => {
//   isHovering.value = false;
// });
//
// onBeforeUnmount(async () => {
//   fileDropHover.then((unlisten) => unlisten());
//   fileDrop.then((unlisten) => unlisten());
//   fileDropCancelled.then((unlisten) => unlisten());
// });
//
// const open = async () => {
//   const path = await dialog.open({
//     filters: [{ name: "image", extensions: ["png", "jpg", "jpeg", "gif"] }],
//   });
//   loadFile(path);
// };
</script>
<template>
  <form
    class="p-8 w-full max-w-xl xl:max-w-7xl space-y-8 divide-y divide-gray-200"
  >
    <div class="space-y-8 divide-y divide-gray-200">
      <div>
        <div>
          <h3 class="text-3xl leading-6 font-medium text-gray-900">
            Mint an NFT
          </h3>
        </div>

        <div class="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="col-span-6 xl:col-span-3 space-y-6">
            <div>
              <Listbox as="div" v-model="selected">
                <ListboxLabel class="block text-sm font-medium text-gray-700">
                  Creator
                </ListboxLabel>
                <div class="mt-1 relative">
                  <ListboxButton
                    class="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  >
                    <span v-if="selected" class="flex items-center">
                      <img
                        :src="selected.avatar"
                        alt=""
                        class="flex-shrink-0 h-6 w-6 rounded-full"
                      />
                      <span class="ml-3 block truncate">{{
                        selected.name
                      }}</span>
                    </span>
                    <span v-else class="flex items-center">
                      <img
                        src=""
                        alt=""
                        class="flex-shrink-0 h-6 w-6 rounded-full"
                      />
                      <span class="ml-3 block truncate">Create new DID...</span>
                    </span>
                    <span
                      class="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none"
                    >
                      <SelectorIcon
                        class="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
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
                            active
                              ? 'text-white bg-emerald-600'
                              : 'text-gray-900',
                            'cursor-default select-none relative py-2 pl-3 pr-9',
                          ]"
                        >
                          <div class="flex items-center">
                            <img
                              :src="did.avatar"
                              alt=""
                              class="flex-shrink-0 h-6 w-6 rounded-full"
                            />
                            <span
                              :class="[
                                selected ? 'font-semibold' : 'font-normal',
                                'ml-3 block truncate',
                              ]"
                            >
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
              <label
                for="title"
                class="block text-sm font-medium text-gray-700"
              >
                Title
              </label>
              <div class="mt-1">
                <input
                  type="text"
                  name="title"
                  id="title"
                  autocomplete="title"
                  class="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
            </div>

            <div>
              <label
                for="about"
                class="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <div class="mt-1">
                <textarea
                  id="about"
                  name="about"
                  rows="5"
                  class="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          <div class="col-span-6 xl:col-span-3">
            <label for="image" class="block text-sm font-medium text-gray-700">
              Image
            </label>
            <div
              v-if="fileContent"
              @click.prevent="open"
              :class="[
                isHovering ? 'border-emerald-500' : 'border-gray-300',
                'cursor-pointer mt-1 flex justify-center border-2 rounded-md',
              ]"
            >
              <img :src="fileContent" />
            </div>
            <div
              v-else
              @click.prevent="open"
              :class="[
                isHovering
                  ? 'border-emerald-500'
                  : 'border-dashed border-gray-300',
                'cursor-pointer mt-1 flex justify-center px-6 pt-5 pb-6 border-2 rounded-md',
              ]"
            >
              <div class="space-y-1 text-center">
                <svg
                  class="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <div class="flex text-sm text-gray-600">
                  <span
                    class="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500"
                  >
                    Upload a file
                  </span>
                  <p class="pl-1">or drag and drop</p>
                </div>
                <p class="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
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
          class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Reset
        </button>
        <button
          type="submit"
          class="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Mint
        </button>
      </div>
    </div>
  </form>
</template>
