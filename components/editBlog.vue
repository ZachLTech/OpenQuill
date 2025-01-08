<script setup lang="ts">
const props = defineProps<{
    blog: {
        id: string;
        title: string;
        description: string | null;
        imageURL: string | null;
        tags: string[];
    }
}>()

const emit = defineEmits(['close', 'update'])
const error = ref('')
const loading = ref(false)
const blogInput = ref({
    blogTitle: props.blog.title,
    blogDescription: props.blog.description || '',
    blogImage: props.blog.imageURL || '',
    blogTags: props.blog.tags || []
})

// Reuse size checking function
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
    const blognameRegex = /^[a-zA-Z0-9\s-]{2,50}$/
    const descriptionTooBig = checkSize(blogInput.blogDescription, 'blog description', 15)
    const tagsTooBig = checkSize(blogInput.blogTags, 'total blog tag size', 0.001)

    if (!blognameRegex.test(blogInput.blogTitle)) return 'Blog Name should be between 2 and 50 characters. Alphanumeric and spaces only.'
    if (descriptionTooBig) return descriptionTooBig
    if (tagsTooBig) return tagsTooBig
    return ''
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

async function handleUpdate() {
    try {
        loading.value = true
        error.value = ''

        const currentUser = await $fetch('/api/user/getAllData')

        if (currentUser && currentUser.frozen) {
            error.value = 'You can\'t do this. Your account is currently frozen.'
            return
        }

        blogInput.value.blogTitle = blogInput.value.blogTitle.trim()
        blogInput.value.blogDescription = blogInput.value.blogDescription.trim()
        blogInput.value.blogImage = blogInput.value.blogImage.trim()
        blogInput.value.blogTags = blogInput.value.blogTags.map(tag => tag.trim())

        error.value = await validateInput(blogInput.value)
        if (error.value) return

        const data = await $fetch('/api/blog/update', {
            method: 'POST',
            body: blogInput.value
        })

        if (data) {
            emit('update')
            emit('close')
        }
    } catch (e: any) {
        error.value = e?.response?._data?.message || 'Failed to update blog'
        console.error('Blog update error:', e)
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div>
        <h2>Edit Blog</h2>
        
        <div v-if="error">{{ error }}</div>

        <form @submit.prevent="handleUpdate">
            <div>
                <label>Blog Name</label>
                <input
                    v-model="blogInput.blogTitle"
                    type="text"
                    placeholder="Blog Name"
                    :disabled="loading"
                />
            </div>

            <div>
                <label>Description</label>
                <input
                    v-model="blogInput.blogDescription"
                    type="text"
                    placeholder="Blog Description"
                    :disabled="loading"
                />
            </div>

            <div>
                <label>Header Image</label>
                <input
                    type="file"
                    accept="image/*"
                    @change="handleFileUpload"
                    :disabled="loading"
                />
                <img 
                    v-if="blogInput.blogImage" 
                    :src="blogInput.blogImage" 
                    alt="Preview" 
                    width="300px"
                    height="120px"
                />
            </div>

            <div>
                <label>Tags</label>
                <input
                    v-model="blogInput.blogTags"
                    type="text"
                    placeholder="Tags (comma-separated)"
                    @input="blogInput.blogTags = ($event.target as HTMLInputElement).value.split(',')"
                    :disabled="loading"
                />
            </div>

            <div>
                <button type="button" @click="emit('close')" :disabled="loading">
                    Cancel
                </button>
                <button 
                    type="submit" 
                    :disabled="loading || (
                        blogInput.blogTitle === blog.title &&
                        blogInput.blogDescription === (blog.description || '') &&
                        blogInput.blogImage === (blog.imageURL || '') &&
                        JSON.stringify(blogInput.blogTags) === JSON.stringify(blog.tags)
                    )"
                >
                    {{ loading ? 'Saving...' : 'Save Changes' }}
                </button>
            </div>
        </form>
    </div>
</template>