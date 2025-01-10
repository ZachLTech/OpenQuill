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

    let step = ref(1)
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
    <div v-if="error" class="p-4 w-screen flex justify-center">
        <div class="w-full p-4 rounded-lg bg-red-500 bg-opacity-20 flex">
            <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
            </div>
            <div class="ml-3">
                <h3 class="text-sm font-medium text-red-400">{{ error }}</h3>
            </div>
        </div>
    </div>

    <div v-if="loading" class="flex justify-center items-center w-screen h-[95vh]">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-gray-500 border-t-green-500"></div>
    </div>

    <div v-else-if="initializing">
        <form @submit.prevent="handleInitialize" class="w-screen h-screen flex justify-center items-center">
            <div v-if="step==1" class="h-[60vh] flex flex-col">
                <h1 class="text-3xl text-center font-extrabold tracking-tight text-text sm:text-4xl">Let's spiffy up your blog a little 😉</h1>
                <label for="description" class="mt-[5vh] mb-2 text-lg text-secondary opacity-15">Blog Description</label>
                <textarea
                    id="description"
                    v-model="blogInput.blogDescription"
                    class="w-[85vw] sm:w-[40vw] h-full p-4 bg-secondary border-0 bg-opacity-15 rounded-lg placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20 text-text text-lg resize-y min-h-[100px] max-h-[400px] focus:outline-none"
                    type="text"
                    placeholder="Describe your blog... What's it about? What can readers expect?"
                    :disabled="loading"
                />
            </div>
            <div v-if="step==2">
                <img 
                    v-if="blogInput.blogImage" 
                    :src="blogInput.blogImage" 
                    alt="Preview" 
                    width="300px"
                    height="120px"
                />
                <input
                    type="file"
                    accept="image/*"
                    placeholder="Blog Header Image URL"
                    @change="handleFileUpload"
                    :disabled="loading"
                />
            </div>
            <div v-if="step==3">
                <input
                    v-model="blogInput.blogTags"
                    type="text"
                    placeholder="Tags (comma-separated)"
                    @input="blogInput.blogTags = ($event.target as HTMLInputElement).value.split(',')"
                    :disabled="loading"
                />
            </div>
            <div class="absolute flex items-center gap-12 bottom-10">
                <button type="button" @click="step--" class="py-3 px-8 border text-gray-400 border-primary rounded hover:bg-opacity-90 disabled:border-gray-600 disabled:hover:cursor-not-allowed transition-all" :disabled="step==1">Back</button>
                <div class="flex h-full gap-4">
                    <div class="h-4 w-4 rounded-full bg-text">
                        <div v-if="step==1" class="w-full h-full bg-primary border-4 rounded-full"></div>
                    </div>
                    <div class="h-4 w-4 rounded-full bg-text">
                        <div v-if="step==2" class="w-full h-full bg-primary border-4 rounded-full"></div>
                    </div>
                    <div class="h-4 w-4 rounded-full bg-text">
                        <div v-if="step==3" class="w-full h-full bg-primary border-4 rounded-full"></div>
                    </div>
                    <div class="h-4 w-4 rounded-full bg-text">
                        <div v-if="step==4" class="w-full h-full bg-primary border-4 rounded-full"></div>
                    </div>
                </div>
                
                <button type="button" @click="step++" class="py-3 px-8 bg-primary rounded hover:bg-opacity-90 disabled:bg-gray-600 disabled:text-gray-400 disabled:hover:cursor-not-allowed transition-all" :disabled="step==4">Next</button>
            </div>
            <button type="submit" :disabled="loading" v-if="step==4">
                {{ loading ? 'Processing...' : 'Initialize Blog' }}
            </button>
        </form>
    </div>

    <div v-else>
        <h2>Ready to see your blog?</h2>
        <NuxtLink :to="`/${blogInput.blogTitle}`">Go there now</NuxtLink>
    </div>
</template>