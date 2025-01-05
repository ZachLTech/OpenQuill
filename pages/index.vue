<script setup lang="ts">
    import type { Blog } from '@prisma/client'

    const { status, signOut } = useAuth()
    const autoRedirectSingleBlog = useRuntimeConfig().public.firstBlogAutoRedirect
    const loading = ref(true)
    const error = ref('')
    let blogs = ref<Blog[]>()
    
    onMounted(async () => {
        try {
            loading.value = true
            const allBlogs = await $fetch<Blog[]>('/api/blog/getAllBlogs')
            blogs.value = allBlogs

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

    <div v-if="loading">
        <br>
        Page Loading...    
    </div>

    <div v-else-if="error">
        {{ error }}
    </div>

    <div v-else>
        <div v-if="blogs?.length <= 0 || blogs == null">
            <p>There aren't any blogs, this must be a new instance. Since this is the first signup, this user will be the blog admin.</p>
            <signupForm />
        </div>
        <div v-else>
            Blog List:
            <br><br>
            <div v-for="blog in blogs">
                <a :href="`/${blog.title}`">{{ blog.title }}</a>
            </div>
        </div>
    </div>
</template>