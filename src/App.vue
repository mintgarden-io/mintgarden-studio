<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue';
import { CogIcon, CollectionIcon, SparklesIcon } from '@heroicons/vue/outline';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { toSvg } from 'jdenticon';
import { chiaState } from './state/chia';
import { IpcService } from './helpers/ipc-service';
import { useRouter } from 'vue-router';

const router = useRouter();
onMounted(() => {
  router.push('/');
});

const navigation = [
  { name: 'My Collections', to: '/collections', icon: CollectionIcon },
  { name: 'Single Mint', to: '/minting', icon: SparklesIcon },
  // { name: 'Bulk Mint (soon)', to: '/bulk', icon: CollectionIcon },
];
const secondaryNavigation = [{ name: 'Settings', to: '/settings', icon: CogIcon }];

const fingerprints = ref<string[]>([]);
const loginInProgress = ref(true);
const loginError = ref<any>(undefined);
const svgString = ref('');

watchEffect(() => {
  if (chiaState.activeFingerprint) {
    svgString.value = toSvg(chiaState.activeFingerprint, 36);
  }
});

const ipc = new IpcService();

let syncPollInterval = undefined;
const init = async () => {
  try {
    chiaState.syncStatus = await ipc.send('get_sync_status');

    syncPollInterval = setInterval(async () => {
      chiaState.syncStatus = await ipc.send('get_sync_status');
    }, 5000);

    const response = await ipc.send<{ fingerprints: string[]; fingerprint: string }>('get_public_keys');
    fingerprints.value = response.fingerprints;
    chiaState.activeFingerprint = response.fingerprint;
  } catch (e) {
    loginError.value = e;
  }
  loginInProgress.value = false;
};
init();

const login = async (fingerprint: string) => {
  loginInProgress.value = true;
  const response = await ipc.send<{ fingerprints: string[]; fingerprint: string }>('log_in', {
    fingerprint,
  });
  chiaState.activeFingerprint = response.fingerprint;
  chiaState.syncStatus = await ipc.send('get_sync_status');
  setTimeout(async () => {
    chiaState.syncStatus = await ipc.send('get_sync_status');
  }, 1000);
  loginInProgress.value = false;
};
</script>

<template>
  <div class="h-full flex">
    <!-- Static sidebar for desktop -->
    <div class="flex flex-shrink-0">
      <div class="flex flex-col w-64">
        <!-- Sidebar component, swap this element with another sidebar if you like -->
        <div class="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-gray-100">
          <div class="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div class="flex items-center flex-shrink-0 px-4">
              <img class="h-8 w-auto" src="/mintgarden-logo.svg" alt="Workflow" />
            </div>
            <nav class="mt-5 flex-1" aria-label="Sidebar">
              <div class="px-2 space-y-1">
                <router-link
                  custom
                  v-slot="{ href, navigate, isActive }"
                  v-for="item in navigation"
                  :key="item.name"
                  :to="item.to"
                >
                  <a
                    :href="href"
                    @click="navigate"
                    :class="[
                      isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                    ]"
                    :aria-current="isActive ? 'page' : undefined"
                  >
                    <component
                      :is="item.icon"
                      :class="[
                        isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500',
                        'mr-3 flex-shrink-0 h-6 w-6',
                      ]"
                      aria-hidden="true"
                    />
                    {{ item.name }}
                  </a>
                </router-link>
              </div>
              <hr class="border-t border-gray-200 my-5" aria-hidden="true" />
              <div class="flex-1 px-2 space-y-1">
                <router-link
                  custom
                  v-slot="{ href, navigate, isActive }"
                  v-for="item in secondaryNavigation"
                  :key="item.name"
                  :to="item.to"
                >
                  <a
                    :href="href"
                    @click="navigate"
                    :class="[
                      isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                    ]"
                    :aria-current="isActive ? 'page' : undefined"
                  >
                    <component
                      :is="item.icon"
                      :class="[
                        isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500',
                        'mr-3 flex-shrink-0 h-6 w-6',
                      ]"
                      aria-hidden="true"
                    />
                    {{ item.name }}
                  </a>
                </router-link>
              </div>
            </nav>
          </div>
          <div class="flex-shrink-0 flex border-t border-gray-200 p-4">
            <Menu as="div" class="relative inline-block text-left">
              <div v-if="chiaState.syncStatus" class="flex items-center mb-4 gap-3">
                <div class="flex h-9 w-9 items-center justify-center">
                  <span class="flex h-3 w-3">
                    <span
                      class="relative inline-flex rounded-full h-3 w-3"
                      :class="
                        chiaState.syncStatus.synced
                          ? 'bg-emerald-500'
                          : chiaState.syncStatus.syncing
                          ? 'bg-orange-500'
                          : 'bg-red-500'
                      "
                    ></span>
                  </span>
                </div>
                <span class="text-gray-900 text-sm">
                  {{ chiaState.syncStatus.synced ? 'Synced' : chiaState.syncStatus.syncing ? 'Syncing' : 'Not synced' }}
                </span>
              </div>
              <div>
                <MenuButton class="flex-shrink-0 w-full group block">
                  <div v-if="loginInProgress" class="text-sm font-medium text-gray-700">Logging in...</div>
                  <div v-else class="flex items-center">
                    <div v-html="svgString"></div>
                    <div class="ml-3">
                      <p class="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        {{ chiaState.activeFingerprint }}
                      </p>
                      <p class="text-xs text-left font-medium text-gray-500 group-hover:text-gray-700">Change key</p>
                    </div>
                  </div>
                </MenuButton>
              </div>

              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <MenuItems
                  class="origin-top-left bottom-full mb-2 absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                  <div class="py-1">
                    <MenuItem v-for="fingerprint in fingerprints" v-slot="{ active }">
                      <a
                        href="#"
                        @click.prevent="login(fingerprint)"
                        :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'block px-4 py-2 text-sm']"
                        >{{ fingerprint }}</a
                      >
                    </MenuItem>
                  </div>
                </MenuItems>
              </transition>
            </Menu>
          </div>
        </div>
      </div>
    </div>
    <div class="flex-1 overflow-scroll min-w-min">
      <router-view></router-view>
    </div>
  </div>
</template>
