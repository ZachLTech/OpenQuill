<script setup lang="ts">
    const { status, signOut } = useAuth()
</script>

<template>
    <p>Home</p>
    <!-- Nav :) -->
    <div v-if="status==='authenticated'">
        <NuxtLink to="/profile">Profile</NuxtLink>
        <button @click="signOut()">Sign Out</button>
    </div>
    <div v-else>
        <NuxtLink to="/signup">Sign Up</NuxtLink>
        <NuxtLink to="/login">Log In</NuxtLink>
    </div>


    <newPostForm v-if="status === 'authenticated'" />

    <h1>Posts</h1>
    <p v-if="status === 'unauthenticated'">
        Login or Signup to make a post
    </p>
    <hr/>
    <postCatalogue />
</template>