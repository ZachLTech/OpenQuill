<script setup lang="ts">
    const { status } = useAuth()

    if (status.value === 'authenticated') {
        navigateTo('/');
    }
</script>

<template>
    <appNav />
    <signupForm class="mt-[15vh]" />
</template>