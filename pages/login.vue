<script setup lang="ts">
    const { status } = useAuth()

    if (status.value === 'authenticated') {
        navigateTo('/');
    }
</script>

<template>
    <!-- <appNav /> -->
    <loginForm class="mt-[15vh]" />
</template>