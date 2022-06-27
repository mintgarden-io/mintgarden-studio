<script setup lang="ts">
import { ref } from 'vue';

const active = ref(false);
const toggleActive = () => {
  active.value = !active.value;
};
</script>

<template>
  <div
    @dragenter.prevent="active = true"
    @dragleave.prevent="active = false"
    @dragover.prevent
    @drop.prevent="active = true"
    :class="{ 'active-dropzone': active }"
    class="max-w-full px-16 py-4 flex flex-col justify-center items-center gap-1 border-dotted border-2 border-black"
  >
    <span>Drop file</span>
    <span>OR</span>
    <button class="btn btn-ghost bg-[#E9B906] hover:bg-[#D9AB07]" for="dropzoneFile">Select file</button>
  </div>
</template>

<style scoped>
.active-dropzone {
  border-color: #e9d5b9;
  background-color: #d9ab07;
}
.active-dropzone label {
  border-color: #e9d5b9;
  background-color: #e9d5b9;
}
</style>
