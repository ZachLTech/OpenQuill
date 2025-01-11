<script setup lang="ts">
    // Types
    import type { Blog } from '@prisma/client'
    // All initial logic declarations
    const { status, signOut } = useAuth()
    const autoRedirectSingleBlog = useRuntimeConfig().public.firstBlogAutoRedirect
    const loading = ref(true)
    const instanceInitialized = ref(false)
    const error = ref('')
    let blogs = ref<Blog[]>()
    // Runs this as soon as the page is mounted - gets all blogs and navigates to single blog if there's only one and .env option is enabled to do so
    onMounted(async () => {
        try {
            loading.value = true
            const allBlogs = await $fetch<Blog[]>('/api/blog/getAllBlogs')
            const admins = await $fetch('/api/user/getAdminData')
            blogs.value = allBlogs
            if (admins) {
                instanceInitialized.value = true
            }

            if (blogs.value[0] && !blogs.value[1] && (autoRedirectSingleBlog === 'true' || autoRedirectSingleBlog === 'True')) {
                navigateTo(`/${blogs.value[0].title}`);
            }
        } catch (e: any) {
            error.value = 'There was an error getting the blogs.'
            console.error('Blog loading error:', e)
        } finally {
            loading.value = false
        }
    })
</script>

<template>
    <div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-gray-500 border-t-green-500"></div>
        </div>
  
        <!-- Error State -->
        <div v-else>
            <div v-if="error" class="p-4 w-screen flex justify-center absolute">
                <div class="w-full p-4 rounded-lg bg-red-500 bg-opacity-20 flex">
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
            <!-- New Instance State -->
            <div v-if="blogs?.length <= 0 || blogs == null && !instanceInitialized" 
                class="text-center py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
                <h2 class="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
                    Welcome to <span class="bg-gradient-to-r from-blue-600 to-indigo-400 inline-block text-transparent bg-clip-text">OpenQuill</span> 
                </h2>
                <p class="mt-4 text-lg text-gray-500">
                    This appears to be a new instance. The first user to sign up will be the administrator.
                </p>
                <div class="mt-8 w-full flex justify-center">
                    <splashSignup class="w-[60%]" />
                </div>
            </div>

            <!-- No Blogs State -->
            <div v-else-if="blogs?.length <= 0 || blogs == null && instanceInitialized"
                class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No blogs</h3>
                <p class="mt-1 text-sm text-gray-500">There aren't any blogs available right now.</p>
            </div>

            <!-- Blog List (not done) -->
            <div v-else>

            </div>
        </div>
      </div>
    </div>
  </template>