<script setup lang="ts">
    const postInput = ref({ postTitle: '', postDescription: '', imageURL: '' })
    const log = ref('')
    const loading = ref(false)
    let intervalId: any = null

    async function createPost() {
        try {
            loading.value = true

            postInput.value.postTitle = postInput.value.postTitle.trim()
            postInput.value.postDescription = postInput.value.postDescription.trim()
            postInput.value.imageURL = postInput.value.imageURL.trim()

            log.value = ''
            
            await $fetch('/api/posts/createPosts', {
                method: 'POST',
                body: postInput.value
            })
        } catch (e: any) {
            log.value = e?.response?._data?.message || 'Signup failed'
            console.error('Signup error:', e)
        } finally {
            if (log.value == '') {
                postInput.value.postTitle = ''
                postInput.value.postDescription = ''
                postInput.value.imageURL = ''
                log.value = 'Post Created!'
            }
            loading.value = false
        }
    }

    onMounted(() => {
        function monitorLog() {
            if (!intervalId) {
                intervalId = setInterval(() => {
                    if (log.value === 'Post Created!') {
                        clearInterval(intervalId)
                        intervalId = null
                        
                        setTimeout(() => {
                            log.value = ''
                            monitorLog()
                        }, 5000)
                    }
                }, 100)
            }
        }

        monitorLog()
    })
    onUnmounted(() => {
        if (intervalId) {
            clearInterval(intervalId)
        }
    })
</script>

<template>
    <form @submit.prevent="createPost">
        <h2>New Post</h2>
        <p v-if="log">{{ log }}</p>
        <input 
            v-model="postInput.postTitle" 
            type="text" 
            placeholder="Title" 
            required 
            :disabled="loading"
        />
        <input 
            v-model="postInput.postDescription" 
            type="text" 
            placeholder="Description" 
            required 
            :disabled="loading"
        />
        <input 
            v-model="postInput.imageURL" 
            type="url" 
            placeholder="Thumbnail URL"  
            :disabled="loading"
        />
        <button type="submit" :disabled="loading">
            {{ loading ? 'Processing...' : 'Post it!' }}
        </button>
    </form>
</template>