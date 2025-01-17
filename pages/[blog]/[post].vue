<script setup lang="ts">
    // Types
    import { marked } from 'marked'
    import type { Post, Image } from '@prisma/client'
    type User = {
        id: string,
        email: string,
        name: string
    }
    // All initial logic declarations
    const route = useRoute()
    const { data, status } = useAuth()
    const loading = ref(true)
    const error = ref('')
    const post = ref<Post | null>(null)
    const images = ref<Image[]>([])
    const relatedPosts = ref<any[]>([])
    const relatedPostsLoading = ref(false)
    const currentSessionUser = ref(data.value?.user as User)
    const isOwner = ref(false)
    // Loads post on mount & redirects if the user isn't the owner & the post isn't published yet
    onMounted(async () => {
        try {
            loading.value = true
            const postData = await $fetch('/api/blog/posts/getData', {
                method: 'POST',
                body: {
                    postId: route.params.post
                }
            })

            if (!postData) {
                error.value = 'Post not found'
                return
            }

            if (!postData.published && status.value != 'authenticated') {
                navigateTo(`/${route.params.blog}`)
                return
            }

            if (!postData.published && postData.ownerId != currentSessionUser.value.id) {
                navigateTo(`/${route.params.blog}`)
                return
            }

            post.value = {
                ...postData,
                createdAt: new Date(postData.createdAt),
                updatedAt: new Date(postData.updatedAt)
            }
            images.value = (() => {
                let imagesToReturn = [];

                for (let i=0;i<postData.images.length;i++) {
                    imagesToReturn.push({
                        ...postData.images[i],
                        createdAt: new Date(postData.images[i].createdAt)
                    })
                }

                return imagesToReturn
            })()

            if (currentSessionUser.value) {
                if (currentSessionUser.value.id == post.value.ownerId) {
                    isOwner.value = true
                }
            }

            fetchRelatedPosts()
        } catch (e: any) {
            error.value = 'Error loading post'
            console.error('Post loading error:', e)
        } finally {
            loading.value = false
        }
    })

    function replaceImageMarkers(content: string) {
        if (!content) return ''
        
        let processedContent = content
        images.value?.forEach(img => {
            const srcMarkerRegex = new RegExp(`src="\\[image:${img.id}:"[^"]*"\\]"`, 'g')
            processedContent = processedContent.replace(
            srcMarkerRegex, 
            `src="${img.image}"`
            )

            const markdownMarkerRegex = new RegExp(`\\[image:${img.id}:"[^"]*"\\]`, 'g')
            processedContent = processedContent.replace(
            markdownMarkerRegex, 
            `![${img.alt || ''}](${img.image})`
            )
        })
        
        return marked(processedContent)
    }

    async function fetchRelatedPosts() {
        if (!post.value?.blogId) return
        
        try {
            relatedPostsLoading.value = true
            const posts = await $fetch('/api/blog/posts/getRecent', {
                method: 'POST',
                body: {
                    page: 1,
                    pageSize: 6,
                    blogId: post.value.blogId
                }
            })
            // Filter out current post and map dates
            relatedPosts.value = posts
                .filter(p => p.id !== route.params.post)
                .map(post => ({
                    ...post,
                    createdAt: new Date(post.createdAt),
                    updatedAt: new Date(post.updatedAt)
                }))
        } catch (e) {
            console.error('Error fetching related posts:', e)
        } finally {
            relatedPostsLoading.value = false
        }
    }
</script>

<template>
    <appNav class="fixed top-0 left-0 right-0 z-50 bg-bg" />

    <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-primary"></div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="p-4 w-full flex justify-center absolute">
        <div class="w-full max-w-6xl p-4 rounded-lg bg-red-500 bg-opacity-20 flex">
            <button @click="error=''" class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
            </button>
            <div class="ml-3">
                <p class="text-sm text-red-400">{{ error }}</p>
            </div>
        </div>
    </div>

    <div v-else-if="post" class="pt-16 min-h-screen bg-bg">
        <div v-if="loading" class="flex justify-center items-center min-h-screen">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-primary"></div>
        </div>

        <div v-else-if="error" class="text-red-500 text-center p-8">{{ error }}</div>

        <article v-else-if="post" class="max-w-6xl mx-auto px-4 sm:px-0 py-8">
            <div class="relative w-full h-[400px] rounded-xl overflow-hidden mb-8">
                <img 
                    v-if="post.heroImg" 
                    :src="post.heroImg" 
                    :alt="post.title"
                    class="w-full h-full object-cover"
                >
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/70 to-transparent"></div>
                <div class="absolute h-full bottom-0 left-0 flex flex-col justify-between p-8">
                    <NuxtLink class="text-lg" :to="`/${route.params.blog}`">
                        {{ post.blog.title }}
                    </NuxtLink>
                    <div>
                        <h1 class="text-4xl font-bold text-white mb-2">{{ post.title }}</h1>
                        <p v-if="post.summary" class="max-h-[190px] text-lg text-gray-200 line-clamp-6">{{ post.summary }}</p>
                    </div>
                </div>
            </div>

            <div class="flex items-center space-x-4 mb-8 p-4 pb-10 border-b border-b-secondary border-opacity-5">
                <img 
                    v-if="post.owner?.image" 
                    :src="post.owner?.image" 
                    :alt="post.owner?.name"
                    class="w-12 h-12 rounded-full"
                />
                <div>
                    <h2 class="text-lg font-semibold text-text">{{ post.owner?.name }} - Author</h2>
                    <a 
                        v-if="post.owner?.website" 
                        :href="post.owner?.website"
                        target="_blank"
                        class="text-primary hover:text-opacity-80"
                    >
                        Website
                    </a>
                </div>
                <div v-if="isOwner">
                    <NuxtLink class="px-4 py-2 bg-primary text-text rounded-lg hover:bg-opacity-90 transition-all disabled:bg-opacity-50 disabled:cursor-not-allowed" :to="`/${route.params.blog}/${route.params.post}-edit`">Edit Post</NuxtLink>
                </div>
            </div>

            <div 
                class="prose prose-invert prose-lg max-w-none pb-10 border-b border-b-secondary border-opacity-5"
                v-html="replaceImageMarkers(post.content || '')"
            ></div>

            <div v-if="relatedPosts.length > 0" class="mt-8">
                <h2 class="text-2xl font-bold text-text mb-6">More Posts from <NuxtLink class="text-primary" :to="`/${route.params.blog}`">this Blog</NuxtLink></h2>
                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <NuxtLink 
                        v-for="post in relatedPosts" 
                        :key="post.id"
                        :to="`/${route.params.blog}/${post.id}`"
                        class="bg-secondary bg-opacity-5 min-h-[140px] w-full rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-4 flex flex-col justify-between"
                        :style="post.heroImg ? { 
                            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.60), rgba(0, 0, 0, 0.60)), url(${post.heroImg})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        } : {}"
                    >
                        <h3 class="text-lg font-semibold text-text mb-2">{{ post.title }}</h3>
                        <p class="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                            {{ post.summary || 'No Summary Provided' }}
                        </p>
                        <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{{ post.createdAt.toLocaleDateString() }}</span>
                            <div v-if="!post.owner.website" class="flex items-center ml-2">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>{{ post.owner.name }}</span>
                            </div>
                        </div>
                    </NuxtLink>
                </div>
            </div>
        </article>
    </div>
</template>

<style scoped>
    .prose img {
        @apply my-8 rounded-lg shadow-lg mx-auto;
        max-height: 600px;
        width: auto;
    }

    .bg-bg {
        @apply bg-[#1e1f20];
    }

    :deep(.prose) {
        @apply text-gray-300;
    }

    :deep(.prose strong) {
        @apply text-white;
    }

    :deep(.prose a) {
        @apply text-primary hover:text-opacity-80;
    }

    :deep(.prose h1, .prose h2, .prose h3, .prose h4) {
        @apply text-white;
    }
</style>