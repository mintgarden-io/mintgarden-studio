import { createApp } from 'vue';
import * as VueRouter from 'vue-router';
import App from './App.vue';
import Setup from './pages/Setup.vue';
import Minting from './pages/Minting.vue';
import BulkMinting from './pages/BulkMinting.vue';
import './index.css';

const routes = [
  { path: '/', component: Setup },
  { path: '/minting', component: Minting },
  { path: '/bulk-minting', component: BulkMinting },
];

const router = VueRouter.createRouter({
  history: process.env.IS_ELECTRON ? VueRouter.createWebHashHistory() : VueRouter.createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app').$nextTick(window.removeLoading);
