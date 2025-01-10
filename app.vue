<script setup>
  const colorMode = useCookie('color-mode')
</script>

<template>
  <div :class="{'dark': colorMode === 'dark'}">
    <div class="min-h-screen bg-bg text-text">
      <NuxtPage />
    </div>
  </div>
</template>
