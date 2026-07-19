<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div>
    <h1>Vehicle History</h1>
    <p>Service record history for vehicle {{ route.params.id }} goes here.</p>
  </div>
</template>
