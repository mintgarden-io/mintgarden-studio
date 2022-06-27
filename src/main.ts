import { createApp } from 'vue';
import * as VueRouter from 'vue-router';
import App from './App.vue';
import Dashboard from './pages/Dashboard.vue';
import Minting from './pages/Minting.vue';
import Settings from './pages/Settings.vue';
import './index.css';

const routes = [
  { path: '/', component: Dashboard },
  { path: '/minting', component: Minting },
  { path: '/settings', component: Settings },
];

const router = VueRouter.createRouter({
  history: process.env.IS_ELECTRON ? VueRouter.createWebHashHistory() : VueRouter.createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app').$nextTick(window.removeLoading);
