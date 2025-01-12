<script setup lang="ts">
    import { useDropZone } from '@vueuse/core'
    // Types
    import type { User } from '@prisma/client'
    // All initial logic declarations
    const { status, signOut } = useAuth()
    const loading = ref(false)
    const error = ref('')
    const success = ref('')
    const hasChanges = ref(false)
    const wantsToDeleteAccount = ref(false)
    const currentUser = ref<User | null>(null)
    const dropZoneRef = ref<HTMLDivElement>()
    const userInput = ref({
        name: '',
        email: '',
        password: '',
        image: '',
        website: ''
    })
    const { isOverDropZone } = useDropZone(dropZoneRef, {
        onDrop,
        dataTypes: ['image/jpeg', 'image/JPEG', 'image/JPG', 'image/PNG', 'image/GIF', 'image/WEBP', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        multiple: false,
        preventDefaultForUnhandled: false,
    })
    // If the user isn't even authenticated then they getting booted back to login
    if (status.value === 'unauthenticated') {
        navigateTo('/login')
    }
    // Runs this as soon as the page is mounted - gets user data
    onMounted(async () => {
        loading.value = true

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

        loading.value = false
    })
    // Watches user input to enable save button when changes are present
    watch(userInput, (newVal) => {
        if (!currentUser.value) return
        
        hasChanges.value = 
            newVal.name != currentUser.value.name ||
            newVal.email != currentUser.value.email ||
            newVal.password != '' ||
            newVal.image != currentUser.value.image ||
            newVal.website != currentUser.value.website
    }, { deep: true })
    // Helper functions and form handling stuff
    // Changes DB
    async function deleteAccount() {
        const admins = await $fetch('/api/user/getAdminData')
        loading.value = true

        if (wantsToDeleteAccount && !currentUser.value?.admin) {
            await $fetch('/api/user/delete', {
                method: 'POST'
            })
            signOut()
        } else if (wantsToDeleteAccount && admins.length>1) {
            await $fetch('/api/user/delete', {
                method: 'POST'
            })
            signOut()
        } else {
            error.value = 'You cannot delete your account if you\'re the only admin.'
            wantsToDeleteAccount.value = false
            loading.value = false
        }
    }

    function validateInput(updateInput: any): string {
        const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
        const usernameRegex = /^[0-9A-Za-z\s-]{2,16}$/
        const passwordRegex = /^(?=.*?[A-Z])(?=.*?[0-9]).{8,}$/
        const websiteRegex = /^https?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/
        
        if (updateInput.email && !emailRegex.test(updateInput.email)) {
            return 'The Email you entered is not valid.'
        } else if (updateInput.name && !usernameRegex.test(updateInput.name)) {
            return 'Username should be between 2 and 16 characters. Alphanumeric & spaces only.'
        } else if (updateInput.password && !passwordRegex.test(updateInput.password)) {
            return 'Password should be at least 8 characters including a number and uppercase letter.'
        } else if (updateInput.website && !websiteRegex.test(updateInput.website)) {
            return 'Make sure to include http(s) in your website URL. It must be a valid URL.'
        } else {
            return ''
        }
    }

    async function onDrop(files: File[] | null) {
        error.value = ''
        const allowedFiletypes = ['image/jpeg', 'image/JPEG', 'image/JPG', 'image/PNG', 'image/GIF', 'image/WEBP', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        
        if (!files || files.length === 0) return
        
        const file = files[0] // Take the first file since multiple is false

        if (!allowedFiletypes.includes(file.type)) {
            error.value = `Please upload a valid image file (JPEG, PNG, WEBP, or GIF)`
            return
        }
        
        if (file.size >= 15 * 1024 * 1024) {
            error.value = 'File size cannot exceed 15MB.'
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            userInput.value.image = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }

    function handleDragOver(event: DragEvent) {
        event.preventDefault()
        event.stopPropagation()
    }

    function handleDrop(event: DragEvent) {
        event.preventDefault()
        event.stopPropagation()
        
        const files = event.dataTransfer?.files
        if (files && files.length > 0) {
            handleFileUpload({ target: { files: files } } as unknown as Event)
        }
    }

    async function handleFileUpload(event: Event) {
        error.value = ''
        const allowedFiletypes = ['image/jpeg', 'image/JPEG', 'image/JPG', 'image/PNG', 'image/GIF', 'image/WEBP', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        const input = event.target as HTMLInputElement
        const file = input.files?.[0]
        
        if (!file) return

        if (!allowedFiletypes.includes(file.type)) {
            error.value = `Please upload a valid image file (JPEG, PNG, WEBP, or GIF)`
            return
        }
        
        if (file.size >= 15 * 1024 * 1024) {
            error.value = 'File size cannot exceed 15MB.'
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            userInput.value.image = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }
    // Changes DB
    async function updateProfile() {
        try {
            loading.value = true

            if (currentUser.value && currentUser.value.frozen) {
                error.value = 'You can\'t do this. Your account is currently frozen.'
                return
            }

            userInput.value.email = userInput.value.email.trim().toLowerCase()
            userInput.value.name = userInput.value.name.trim()
            userInput.value.password = userInput.value.password.trim()
            userInput.value.image = userInput.value.image.trim()
            userInput.value.website = userInput.value.website.trim()

            error.value = validateInput(userInput.value)

            if (error.value != '') {
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
                success.value = 'Profile updated successfully!'
            }
        } catch (e: any) {
            error.value = e?.response?._data?.message || 'Failed to update profile'
        } finally {
            loading.value = false
        }
    }
</script>

<template>
    <appNav />
    <div class="min-h-screen bg-bg py-8 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto">
            <h1 class="text-3xl font-extrabold text-text mb-8">Profile Settings</h1>
            
            <div v-if="error" class="w-full flex justify-center">
                <div class="w-full mb-2 p-4 rounded-lg bg-red-500 bg-opacity-20 flex">
                    <button @click="error=''" class="flex-shrink-0">
                        <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                        </svg>
                    </button>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-400">{{ error }}</h3>
                    </div>
                </div>
            </div>

            <div v-if="success" class="w-full flex justify-center">
                <div class="w-full mb-2 p-4 rounded-lg bg-green-500 bg-opacity-20 flex">
                    <button @click="success=''" class="flex-shrink-0">
                        <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                        </svg>
                    </button>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-green-400">{{ success }}</h3>
                    </div>
                </div>
            </div>

            <form @submit.prevent="updateProfile" class="space-y-6 bg-secondary bg-opacity-5 p-8 rounded-lg">
                <div>
                    <label class="block text-sm font-medium text-secondary opacity-70 mb-2">Name</label>
                    <input
                        v-model="userInput.name"
                        type="text"
                        placeholder="Your name"
                        :disabled="loading"
                        class="w-full p-4 bg-secondary bg-opacity-5 border-0 rounded-lg placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20text-textdisabled:bg-opacity-5 disabled:cursor-not-allowedtransition-all"
                    />
                </div>

                <div>
                    <label class="block text-sm font-medium text-secondary opacity-70 mb-2">Email</label>
                    <input
                        v-model="userInput.email"
                        type="email"
                        placeholder="Your email"
                        :disabled="loading"
                        class="w-full p-4 bg-secondary bg-opacity-5 border-0 rounded-lg placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20text-textdisabled:bg-opacity-5 disabled:cursor-not-allowedtransition-all"
                    />
                </div>

                <div>
                    <label class="block text-sm font-medium text-secondary opacity-70 mb-2">
                        New Password (leave empty to keep current)
                    </label>
                    <input
                        v-model="userInput.password"
                        type="password"
                        placeholder="New password"
                        :disabled="loading"
                        class="w-full p-4 bg-secondary bg-opacity-5 border-0 rounded-lg placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20text-textdisabled:bg-opacity-5 disabled:cursor-not-allowedtransition-all"
                    />
                </div>

                <input
                    type="file"
                    ref="dropZoneRef"
                    accept="image/*"
                    class="hidden" 
                    id="fileInput"
                    :disabled="loading"
                    @change="handleFileUpload"
                    placeholder="Blog Header Image URL"
                />
                <label class="flex items-center text-sm font-medium text-secondary opacity-70 mb-2">Profile Image
                    <button v-if="userInput.image" 
                        @click.prevent="userInput.image = ''" 
                        class="p-1 rounded-full"
                    >
                        <svg class="w-5 h-5 text-text hover:text-red-400 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </label>
                <label 
                    for="fileInput" 
                    class="flex justify-center items-center w-full h-[30vh] p-4 bg-secondary bg-opacity-5 border-2 border-dashed border-secondary border-opacity-25 rounded-lg text-center cursor-pointer hover:border-opacity-50 transition-all"
                    @dragover="handleDragOver"
                    @drop="handleDrop"
                >   
                    <div v-if="!userInput.image" class="h-full flex flex-col items-center justify-center">
                        <svg class="w-16 h-16 mb-4 text-secondary opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span class="text-secondary text-lg opacity-50">Click to upload or drag and drop</span>
                        <span class="text-md text-secondary opacity-40 mt-2">JPEG, PNG, WEBP or GIF (max. 15MB)</span>
                    </div>
                    <img 
                        v-if="userInput.image" 
                        :src="userInput.image" 
                        alt="Preview" 
                        class="inline-block rounded-full ring-2 ring-secondary ring-opacity-20 w-[30%] aspect-square object-cover"
                    />
                </label>

                <div>
                    <label class="block text-sm font-medium text-secondary opacity-70 mb-2">Website</label>
                    <input
                        v-model="userInput.website"
                        type="url"
                        placeholder="Your website"
                        :disabled="loading"
                        class="w-full p-4 bg-secondary bg-opacity-5 border-0 rounded-lg placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20text-textdisabled:bg-opacity-5 disabled:cursor-not-allowedtransition-all"
                    />
                </div>

                <button 
                    type="submit" 
                    :disabled="loading || !hasChanges"
                    class="w-full py-4 bg-primary text-lg font-medium rounded-lg hover:bg-opacity-90 transition-alldisabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    {{ loading ? 'Loading...' : hasChanges ? 'Save Changes' : 'Saved' }}
                </button>
            </form>

            <div class="mt-8 bg-red-500 bg-opacity-10 p-8 rounded-lg">
                <h2 class="text-xl font-bold text-red-400 mb-4">Danger Zone</h2>
                <button 
                    @click="wantsToDeleteAccount=true"
                    class="px-4 py-2 bg-red-500 text-text rounded hover:bg-opacity-90 transition-all"
                >
                    Delete Account
                </button>
                
                <div v-if="wantsToDeleteAccount" class="mt-4 p-4 bg-red-500 bg-opacity-20 rounded-lg">
                    <p class="text-red-400 mb-4">Are you sure you want to delete your account?</p>
                    <div class="flex gap-4">
                        <button 
                            @click="deleteAccount()"
                            class="px-4 py-2 bg-red-500 text-text rounded hover:bg-opacity-90 transition-all"
                        >
                            Yes, Delete
                        </button>
                        <button 
                            @click="wantsToDeleteAccount = false"
                            class="px-4 py-2 bg-gray-600 text-text rounded hover:bg-opacity-90 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="currentUser?.admin" class="mt-8">
                <h1 class="text-3xl font-extrabold text-text mb-8">Admin Dashboard</h1>
                <adminDashboard />
            </div>
        </div>
    </div>
</template>