<script setup lang="ts">
    const { status } = useAuth()

    if (status.value === 'authenticated') {
        navigateTo('/');
    }
</script>

<template>
    <NuxtLink to="/">Home</NuxtLink>
    <signupForm class="mt-[15vh]" />
</template>