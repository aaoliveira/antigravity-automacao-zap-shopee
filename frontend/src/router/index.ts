import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ForgotView from '../views/ForgotView.vue';
import DashboardView from '../views/DashboardView.vue';
import ShopeeCredentialsView from '../views/ShopeeCredentialsView.vue';
import WhatsAppInstancesView from '../views/WhatsAppInstancesView.vue';
import AutomationsView from '../views/AutomationsView.vue';
import HistoryView from '../views/HistoryView.vue';
import SettingsView from '../views/SettingsView.vue';
import JoinGroupRedirectView from '../views/JoinGroupRedirectView.vue';
import CouponsView from '../views/CouponsView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { guestOnly: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotView,
      meta: { guestOnly: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/shopee-credentials',
      name: 'shopee-credentials',
      component: ShopeeCredentialsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/whatsapp-instances',
      name: 'whatsapp-instances',
      component: WhatsAppInstancesView,
      meta: { requiresAuth: true },
    },
    {
      path: '/automations',
      name: 'automations',
      component: AutomationsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryView,
      meta: { requiresAuth: true },
    },
    {
      path: '/coupons',
      name: 'coupons',
      component: CouponsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/join/:slug',
      name: 'join-group',
      component: JoinGroupRedirectView,
      meta: { public: true },
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('access_token');

  if (to.meta.requiresAuth && !token) {
    next('/login');
  } else if (to.meta.guestOnly && token) {
    next('/dashboard');
  } else {
    next();
  }
});

export default router;
