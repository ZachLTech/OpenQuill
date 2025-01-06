<script setup lang="ts">
    const { status, signOut } = useAuth()
</script>

<template>
    <div v-if="status==='authenticated'">
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/profile">Profile</NuxtLink>
        <button @click="signOut()">Sign Out</button>
    </div>
    <div v-else>
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/signup">Sign Up</NuxtLink>
        <NuxtLink to="/login">Log In</NuxtLink>
    </div>
</template>