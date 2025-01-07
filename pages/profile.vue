<script setup lang="ts">
import type { User } from '@prisma/client'

const { data, status, signOut } = useAuth()
const loading = ref(false)
const error = ref('')
const hasChanges = ref(false)
const wantsToDeleteAccount = ref(false)
const currentUser = ref<User | null>(null)

const userInput = ref({
    name: '',
    email: '',
    password: '',
    image: '',
    website: ''
})

async function deleteAccount() {
    if (wantsToDeleteAccount) {
      await $fetch('/api/DeleteAccount', {
        method: 'POST'
      })
      signOut()
    }
  }

watch(userInput, (newVal) => {
    if (!currentUser.value) return
    
    hasChanges.value = 
        newVal.name != currentUser.value.name ||
        newVal.email != currentUser.value.email ||
        newVal.password != '' ||
        newVal.image != currentUser.value.image ||
        newVal.website != currentUser.value.website
}, { deep: true })

async function updateProfile() {
    try {
        loading.value = true
        error.value = ''

        if (currentUser.value && currentUser.value.frozen) {
            error.value = 'You can\'t do this. Your account is currently frozen.'
            return
        }

        const updatedUser = await $fetch('/api/user/update', {
            method: 'POST',
            body: userInput.value
        })

        currentUser.value = {
          ...updatedUser,
          password: 'Placeholder',
          createdAt: new Date(updatedUser.createdAt),
          updatedAt: new Date(updatedUser.updatedAt)
        }

        if (updatedUser) {
            hasChanges.value = false
            error.value = 'Profile updated successfully!'
        }
    } catch (e: any) {
        error.value = e?.response?._data?.message || 'Failed to update profile'
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    if (status.value != 'authenticated') {
      navigateTo('/login')
    }

    const userData = await $fetch('/api/user/getAllData')
    if (userData) {
        userInput.value = {
            name: userData.name || '',
            email: userData.email || '',
            password: '',
            image: userData.image || '',
            website: userData.website || ''
        }

        currentUser.value = {
          ...userData,
          password: 'Placeholder',
          createdAt: new Date(userData.createdAt),
          updatedAt: new Date(userData.updatedAt)
        }
    }
})

if (status.value === 'unauthenticated') {
    navigateTo('/login')
}
</script>

<template>
    <div>
        <tempNav />
        
        <h1>Profile Settings</h1>
        
        <div v-if="error">
            {{ error }}
        </div>

        <form @submit.prevent="updateProfile">
            <div>
                <label>Name</label>
                <input
                    v-model="userInput.name"
                    type="text"
                    placeholder="Your name"
                    :disabled="loading"
                />
            </div>

            <div>
                <label>Email</label>
                <input
                    v-model="userInput.email"
                    type="email"
                    placeholder="Your email"
                    :disabled="loading"
                />
            </div>

            <div>
                <label>New Password (leave empty to keep current)</label>
                <input
                    v-model="userInput.password"
                    type="password"
                    placeholder="New password"
                    :disabled="loading"
                />
            </div>

            <div>
                <label>Profile Image URL</label>
                <input
                    v-model="userInput.image"
                    type="url"
                    placeholder="Profile image URL"
                    :disabled="loading"
                />
            </div>

            <div>
                <label>Website</label>
                <input
                    v-model="userInput.website"
                    type="url"
                    placeholder="Your website"
                    :disabled="loading"
                />
            </div>

            <div>
                <button 
                    type="submit" 
                    :disabled="loading || !hasChanges"
                >
                    {{ loading ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved' }}
                </button>
            </div>
        </form>

        <div v-if="currentUser?.admin">
            <adminDashboard />
        </div>

        <div>
            <h2>Danger Zone</h2>
            <button @click="wantsToDeleteAccount = true">Delete Account</button>
            
            <div v-if="wantsToDeleteAccount"">
                <p>Are you sure you want to delete your account?</p>
                <button @click="deleteAccount()">Yes, Delete</button>
                <button @click="wantsToDeleteAccount = false">Cancel</button>
            </div>
        </div>
    </div>
</template>