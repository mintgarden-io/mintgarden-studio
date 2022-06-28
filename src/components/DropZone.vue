<script setup lang="ts">
import { ref } from 'vue';
import { PhotographIcon } from '@heroicons/vue/outline';

const active = ref(false);
</script>

<template>
  <label
    for="dropzoneFile"
    @dragenter.prevent="active = true"
    @dragleave.prevent="active = false"
    @dragover.prevent
    @drop.prevent="active = false"
    :class="[active ? 'border-gray-400' : 'border-gray-300']"
    class="cursor-pointer relative block w-full border-2 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
  >
    <PhotographIcon
      :class="[active ? 'text-gray-500' : 'text-gray-400']"
      class="pointer-events-none mx-auto h-12 w-12"
    />
    <span class="pointer-events-none mt-2 block text-sm font-medium text-gray-600"
      >Drop an image, or click to select a file</span
    >
    <p class="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
    <input type="file" id="dropzoneFile" class="hidden" accept="image/*" />
  </label>
</template>
