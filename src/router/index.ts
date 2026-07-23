import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import VehicleManagement from '../views/VehicleManagement.vue'
import VehicleHistory from '../views/VehicleHistory.vue'
import MaintenanceReport from '../views/MaintenanceReport.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/vehicles', name: 'vehicles', component: VehicleManagement },
    { path: '/vehicles/:id', name: 'vehicle-history', component: VehicleHistory },
    { path: '/vehicles/:id/report', name: 'vehicle-report', component: MaintenanceReport },
  ],
})

export default router
