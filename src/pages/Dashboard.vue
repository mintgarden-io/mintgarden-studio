<script setup>
// import { invoke } from "@tauri-apps/api/tauri";
import { ref, watchEffect } from 'vue';
import { chiaState } from '../state/chia';

const chiaRoot = ref('');
const balance = ref(undefined);

// const init = async () => {
//   try {
//     chiaRoot.value = await invoke("get_chia_root");
//   } catch (e) {
//     chiaRoot.value = e;
//   }
//
//   watchEffect(async () => {
//     console.log(chiaState.activeFingerprint);
//     const get_balance = await invoke("get_wallet_balance", {
//       endpoint: "get_wallet_balance",
//       walletId: 1,
//     });
//
//     balance.value = get_balance;
//   });
// };
// init();
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl">Dashboard</h1>
    <div class="mt-4 flex flex-col space-y-4">
      <span>CHIA_ROOT: {{ chiaRoot }}</span>
      <!--      <div v-if="loginInProgress">Logging in...</div>-->
      <!--      <div v-else class="mt-4 flex flex-col space-y-4">-->
      <!--        <span v-if="activeFingerprint"-->
      <!--          >Logged in as {{ activeFingerprint }}</span-->
      <!--        >-->

      <!--        <div v-if="balance">-->
      <!--          Spendable balance: {{ balance.spendable_balance / 10 ** 12 }} TXCH-->
      <!--        </div>-->
      <!--      </div>-->
    </div>
  </div>
</template>
