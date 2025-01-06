<script setup lang="ts">
    import { marked } from 'marked'
    import type { Post, Image } from '@prisma/client'

    const route = useRoute()
    const { data, status } = useAuth()
    const loading = ref(true)
    const error = ref('')
    const post = ref<Post | null>(null)
    const images = ref<Image[]>([])

    type User = {
        id: string,
        email: string,
        name: string
    }
    const currentSessionUser = ref(data.value?.user as User)

    function replaceImageMarkers(content: string) {
        if (!content) return ''
        
        let processedContent = content
        // Replace [image:ID:"alt text"] markers with markdown image syntax
        images.value?.forEach(img => {
            const markerRegex = new RegExp(`\\[image:${img.id}:"[^"]*"\\]`, 'g')
            processedContent = processedContent.replace(
                markerRegex, 
                `![${img.alt || ''}](${img.image})`
            )
        })
        
        return marked(processedContent)
    }

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
        } catch (e: any) {
            error.value = 'Error loading post'
            console.error('Post loading error:', e)
        } finally {
            loading.value = false
        }
    })
</script>

<template>
    <div>
        <tempNav />

        <div v-if="loading">Loading post...</div>

        <div v-else-if="error">{{ error }}</div>

        <div v-else-if="post">
            <div>
                <h1>{{ post.title }}</h1>
                
                <div>
                    <p>By {{ post.owner?.name }}</p>
                    <p>Last updated: {{ post.updatedAt.toLocaleDateString() }}</p>
                    <p v-if="!post.published">
                        Not Published
                    </p>
                </div>

                <img 
                    v-if="post.heroImg" 
                    width="500px"
                    :src="post.heroImg" 
                    :alt="post.title"
                >

                <p v-if="post.summary">
                    {{ post.summary }}
                </p>

                <div v-if="post.tags?.length">
                    <span v-for="tag in post.tags" :key="tag">
                        {{ tag }}
                    </span>
                </div>
            </div>

            <div 
                class="post-content"
                v-html="replaceImageMarkers(post.content || '')"
            ></div>

            <div v-if="status == 'authenticated'">
                <NuxtLink v-if="currentSessionUser.id == post.ownerId" :to="`/${route.params.blog}/${post.id}-edit`">
                    Edit Post
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .post-content :deep(img) {
        max-width: 500px;
        height: auto;
    }
</style>