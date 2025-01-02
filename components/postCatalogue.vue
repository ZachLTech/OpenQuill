<script setup lang="ts">
    const route = useRoute()
    const router = useRouter()
    const log = ref('')
    const postsPerPage = ref(5)
    const totalPages = Math.ceil(await $fetch('/api/posts/postsLen') / postsPerPage.value)
    let currentPageNumber = ref(Number(route.query.page) || 1)
    let currentPagePosts = await getPosts()

    async function getPosts() {
        const pagePosts = await $fetch('/api/posts/getPosts', {
            method: 'POST',
            body: {
                page: currentPageNumber.value,
                pageSize: postsPerPage.value
            }
        })

        return pagePosts
    }

    async function getPage(direction: boolean) {
        try {
            log.value = direction ? 'Loading Next Page...' : 'Loading Previous Page...'
            await router.push({
                path: '/',
                query: {
                    page: direction ? currentPageNumber.value++ : currentPageNumber.value--
                }
            })
            currentPagePosts = await getPosts()
        } catch (e: any) {
            log.value = e?.response?._data?.message || 'Failed loading posts...'
            console.error('Error loading posts:', e)
        } finally {
            log.value = ''
        }
    }
</script>

<template>
    <p v-if="log">{{ log }}</p>
    <p>Page {{ currentPageNumber }} of {{ totalPages }}</p>
    <button v-if="currentPageNumber > 1" @click="getPage(false)">Previous Page</button>
    <button v-if="currentPageNumber < totalPages"  @click="getPage(true)">Next Page</button>
    <hr>
    <div v-for="post in currentPagePosts">
        <img width="300px" height="150px" v-if="post.imageURL" :src="post.imageURL" alt="<Post Thumbnail Failed To Load>">
        <h2>{{ post.title }}</h2>
        <h4>Author: {{ post.user.name }} | PostID: {{ post.id }}</h4>
        <p>{{ post.description }}</p>
        <hr>
    </div>
    <button v-if="currentPageNumber > 1" @click="getPage(false)">Previous Page</button>
    <button v-if="currentPageNumber < totalPages"  @click="getPage(true)">Next Page</button>
</template>