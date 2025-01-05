<script setup lang="ts">
    import type { Blog, Post } from '@prisma/client'

    const route = useRoute()
    const { data } = useAuth()
    let loading = ref(true)
    let error = ref('')
    let blog = ref<Blog | null>(null)
    let posts = ref<Post[]>([])
    let postsPerPage = 5
    let currentPage = ref(1)
    let isEditing = ref(false)

    type User = {
        id: string,
        email: string,
        name: string
    }
    let currentSessionUser = ref(data.value?.user)

    async function handleBlogUpdate() {
        try {
            loading.value = true
            const blogData = await $fetch('/api/blog/getData', {
                method: 'POST',
                body: {
                    blogTitle: route.params.blog
                }
            })
            if (blogData) {
                blog.value = {
                    ...blogData,
                    createdAt: new Date(blogData.createdAt),
                    updatedAt: new Date(blogData.updatedAt)
                }
            } else if (!blogData) {
                const allBlogs = await $fetch('/api/blog/getAllBlogs')
                for (let i=0;i<allBlogs.length;i++) {
                    if (allBlogs[i].ownerId == blog.value?.ownerId) {
                        navigateTo(`/${allBlogs[i].title}`)
                    }
                }
            }
        } catch (e: any) {
            error.value = 'Error loading blog'
            console.error('Blog loading error:', e)
        } finally {
            loading.value = false
        }
    }

    async function createNewPost() {
        const newPost = await $fetch('/api/blog/posts/create', {
            method: 'POST',
            body: {
                title: ''
            }
        });
        navigateTo(`/${blog.value?.title}/${newPost.id}-edit`);
    }

    onMounted(async () => {
        try {
            loading.value = true
            const blogData = await $fetch('/api/blog/getData', {
                method: 'POST',
                body: {
                    blogTitle: route.params.blog
                }
            })
            if (blogData) {
                blog.value = {
                    ...blogData,
                    createdAt: new Date(blogData.createdAt),
                    updatedAt: new Date(blogData.updatedAt)
                }
            }

            if (!blog.value) {
                error.value = 'Blog not found'
                return
            }

            const postsData = await $fetch('/api/blog/posts/getPreviews', {
                method: 'POST',
                body: {
                    page: currentPage.value,
                    pageSize: postsPerPage,
                    blogId: blog.value.id
                }
            })
            // @ts-ignore
            posts.value = postsData

        } catch (e: any) {
            error.value = 'Error loading blog'
            console.error('Blog loading error:', e)
        } finally {
            loading.value = false
        }
    })
</script>

<template>
    <tempNav />

    <div v-if="loading">Loading blog...</div>

    <div v-else-if="error">{{ error }}</div>

    <div v-else-if="blog">
        <!-- Reserved for blog owner -->
        <div v-if="(currentSessionUser as User).id == blog?.ownerId">
            <!-- Blog edits -->
            <button v-if="!isEditing" @click="isEditing = true">Edit Blog</button>
            <editBlog
                v-if="isEditing"
                :blog="blog"
                @close="isEditing = false"
                @update="handleBlogUpdate"
            />
            <!-- New post stuff -->
            <button @click="createNewPost">New Post</button>
        </div>
        <!-- skeleton blog details -->
        <h1>{{ blog.title }}</h1>
        <p v-if="blog.description">{{ blog.description }}</p>
        <img width="400" height="175" v-if="blog.imageURL" :src="blog.imageURL" alt="Blog header image">
        
        <div v-if="blog.tags && blog.tags.length > 0">
            Tags: 
            <span v-for="tag in blog.tags" :key="tag">
                {{ tag }}
            </span>
        </div>
        <!-- skeleton blog posts -->
        <div v-if="posts.length > 0">
            <h2>Posts</h2>
            <div v-for="post in posts" :key="post.id">
                <h3>{{ post.title }}</h3>
                <p v-if="post.summary">{{ post.summary }}</p>
                <NuxtLink :to="`/${blog.title}/${post.id}`">Read more</NuxtLink>
            </div>
        </div>
        <div v-else>
            No posts yet
        </div>
    </div>
</template>