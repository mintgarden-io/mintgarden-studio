import { createApp } from 'vue';
import * as VueRouter from 'vue-router';
import App from './App.vue';
import Setup from './pages/Setup.vue';
import Minting from './pages/Minting.vue';
import BulkMinting from './pages/BulkMinting.vue';
import Settings from './pages/Settings.vue';
import CollectionList from './pages/collection/CollectionList.vue';
import CollectionDetails from './pages/collection/CollectionDetails.vue';
import './index.css';
import { IpcService } from './helpers/ipc-service';

const ipc = new IpcService();

let testConnection = async () => {
  try {
    await ipc.send('connect');
  } catch (e) {
    return '/';
  }
};
const routes = [
  { path: '/', component: Setup },
  {
    path: '/minting',
    component: Minting,
    beforeEnter: [testConnection],
  },
  { path: '/collections', component: CollectionList },
  { path: '/collections/:id', component: CollectionDetails },
  { path: '/bulk-minting', component: BulkMinting, beforeEnter: [testConnection] },
  { path: '/settings', component: Settings },
];

const router = VueRouter.createRouter({
  history: process.env.IS_ELECTRON ? VueRouter.createWebHashHistory() : VueRouter.createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app').$nextTick(window.removeLoading);
