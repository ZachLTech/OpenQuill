<script setup lang="ts">
  const { data, status, signOut } = useAuth();
  const wantsToDeleteAccount = ref(false)

  if (status.value === 'unauthenticated') {
    navigateTo('/login');
  }

  async function deleteAccount() {
    if (wantsToDeleteAccount) {
      await $fetch('/api/DeleteAccount', {
        method: 'POST'
      })
      signOut()
    }
  }
</script>

<template>
  <p>Profile</p>
  <NuxtLink to="/">Home</NuxtLink>
  <button @click="signOut()">Sign Out</button>
  <button @click="wantsToDeleteAccount = true">Delete Account</button>
  <div v-if="wantsToDeleteAccount">
    <p>Are you sure you want to delete your account?</p>
    <button @click="deleteAccount()">Yes</button>
    <button @click="wantsToDeleteAccount = false">No</button>
  </div>
  <h1>Here's your profile data: </h1>
  <pre>{{ data }}</pre>
</template>