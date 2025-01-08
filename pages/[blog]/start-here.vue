<script setup lang="ts">
    // Types
    type User = {
        name: string,
        email: string,
        image: string,
        id: string
    }
    // All initial logic declarations
    const { status, data } = useAuth()
    const route = useRoute()
    const loading = ref(true)
    const error = ref('')
    const initializing = ref(true)
    const thisUserData = data.value?.user
    const blogInput = ref({
        blogTitle: route.params.blog as string,
        blogDescription: '',
        blogImage: '',
        blogTags: [] as string[]
    })
    // If the user isn't even authenticated then they getting booted straight back to login
    if (status.value === 'unauthenticated') {
        navigateTo('/login');
    }
    // Runs this as soon as the page is mounted - gets blog data  and makes sure it's not already initialized nor is the person trying to access it unauthorized
    onMounted(async () => {
        try {
            loading.value = true
            const blogData = await $fetch('/api/blog/getData', {
                method: 'POST',
                body: {
                    blogTitle: route.params.blog
                }
            })

            if (!blogData) {
                navigateTo('/')
                return
            } else if ((thisUserData as User).id != blogData.ownerId) {
                navigateTo(`/${blogData.title}`)
                return
            }

            if (blogData.description || blogData.imageURL || blogData.tags?.length > 0) {
                navigateTo(`/${blogData.title}`)
                return
            }

            initializing.value = true
        } catch (e: any) {
            error.value = e?.response?._data?.message || 'Failed to load blog'
            console.error('Blog loading error:', e)
        } finally {
            loading.value = false
        }
    })
    // Helper functions and form handling stuff
    function checkSize(input: any, inputName: string, size: number) {
        if (input) {
            try {
                let inputSize = 0;
                
                if (Array.isArray(input)) {    
                    inputSize = input.reduce((total, item) => {
                        return total + new Blob([item]).size;
                    }, 0);
                } else {
                    inputSize = new Blob([input]).size;
                }
                
                if (inputSize > size * 1024 * 1024) {
                    return `Your inputted ${inputName} is too large. There is a ${size}MB maximum for this input field.`;
                }
                return '';
            } catch (e) {
                console.error(`ERROR: ${e}`);
                return `Something went wrong while checking input size...`;
            }
        }
        return '';
    }

    function validateInput(blogInput: any): string {        
        const descriptionTooBig = checkSize(blogInput.blogDescription, 'blog description', 15)
        const tagsTooBig = checkSize(blogInput.blogTags, 'total blog tag size', 0.001)

        if (descriptionTooBig) {
            return descriptionTooBig
        } else if (tagsTooBig) {
            return tagsTooBig
        } else {
            return ''
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
            blogInput.value.blogImage = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }
    // Changes DB
    async function handleInitialize() {
        try {
            loading.value = true
            error.value = ''

            blogInput.value.blogDescription = blogInput.value.blogDescription.trim()
            blogInput.value.blogImage = blogInput.value.blogImage.trim()
            for (let i=0;i<blogInput.value.blogTags.length;i++) {
                blogInput.value.blogTags[i] = blogInput.value.blogTags[i].trim()
            }

            error.value = await validateInput(blogInput.value)

            if (error.value != '') {
                return
            }

            const data = await $fetch('/api/blog/update', {
                method: 'POST',
                body: blogInput.value
            })

            if (data) {
                initializing.value = false
            }
        } catch (e: any) {
            error.value = e?.response?._data?.message || 'Failed to initialize blog'
            console.error('Blog initialization error:', e)
        } finally {
            loading.value = false
        }
    }
</script>

<template>
    <div v-if="error">{{ error }}</div>

    <div v-if="loading">Loading...</div>
    <div v-else-if="initializing">
        <h1>Let's customize your blog!</h1>
        <form @submit.prevent="handleInitialize">
            <input
                v-model="blogInput.blogDescription"
                type="text"
                placeholder="Blog Description"
                :disabled="loading"
            />
            <input
                type="file"
                accept="image/*"
                placeholder="Blog Header Image URL"
                @change="handleFileUpload"
                :disabled="loading"
            />
            <input
                v-model="blogInput.blogTags"
                type="text"
                placeholder="Tags (comma-separated)"
                @input="blogInput.blogTags = ($event.target as HTMLInputElement).value.split(',')"
                :disabled="loading"
            />
            <img 
                v-if="blogInput.blogImage" 
                :src="blogInput.blogImage" 
                alt="Preview" 
                width="300px"
                height="120px"
            />
            <button type="submit" :disabled="loading">
                {{ loading ? 'Processing...' : 'Initialize Blog' }}
            </button>
        </form>
    </div>

    <div v-else>
        <h2>Ready to see your blog?</h2>
        <NuxtLink :to="`/${blogInput.blogTitle}`">Go there now</NuxtLink>
    </div>
</template>