import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import VehicleManagement from '../views/VehicleManagement.vue'
import VehicleHistory from '../views/VehicleHistory.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/vehicles', name: 'vehicles', component: VehicleManagement },
    { path: '/vehicles/:id', name: 'vehicle-history', component: VehicleHistory },
  ],
})

export default router
