<script setup lang="ts">
    // Types
    import type { Post, Image, User as FullUser } from '@prisma/client'
    type User = {
        id: string,
        email: string,
        name: string
    }
    // All initial logic declarations
    const { status, data } = useAuth()
    const route = useRoute()
    const loading = ref(false)
    const error = ref('')
    const imageError = ref('')
    const post = ref<Post | null>(null)
    const images = ref<Image[]>([])
    const showAltModal = ref(false)
    const pendingImage = ref<{file: File, dataUrl: string} | null>(null)
    const pendingAlt = ref('')
    const editingImageId = ref<string | null>(null)
    const newAltText = ref<string | null>('')
    const hasChanges = ref(false)
    const currentSessionUser = data.value?.user
    const autoSaveEnabled = ref(true)
    const postInput = ref({
        postId: route.params.post as string,
        title: '',
        heroImg: '',
        summary: '',
        content: '',
        tags: [] as string[],
        published: false
    })
    let currentUserFull: FullUser
    let autoSaveInterval: NodeJS.Timeout
    // If the user isn't even authenticated then they getting booted back to the normal post
    if (status.value != 'authenticated') {
        navigateTo(`/${route.params.blog}/${route.params.post}`)
    }
    // Runs this as soon as the page is mounted - sets up autosave if a enabled, gets post data, makes sure the user is allowed to be there, and gets user
    onMounted(async () => {
        // Get and enable or disable autosave setting
        const savedPreference = localStorage.getItem('autoSaveEnabled')
        if (savedPreference !== null) {
            autoSaveEnabled.value = savedPreference === 'true'
        }

        if (autoSaveEnabled.value) {
            autoSaveInterval = setInterval(async () => {
                if (hasChanges.value) {
                    await savePost()
                }
            }, 30000)
        }
        // Get the post and user info and validate they're allowed to be here (redirect if they shouldn't have access)
        const thisPost = await $fetch('/api/blog/posts/getData', {
            method: 'POST',
            body: {
                postId: route.params.post
            }
        })

        if (!thisPost) {
            navigateTo(`/${route.params.blog}`)
        } else if (thisPost.ownerId != (currentSessionUser as User).id && thisPost.published) {
            navigateTo(`/${route.params.blog}/${route.params.post}`)
        } else if (thisPost.ownerId != (currentSessionUser as User).id) {
            navigateTo(`/${route.params.blog}`)
        } else {
            post.value = {
                ...thisPost,
                createdAt: new Date(thisPost.createdAt),
                updatedAt: new Date(thisPost.updatedAt)
            }
            images.value = (() => {
                let imagesToReturn = [];

                for (let i=0;i<thisPost.images.length;i++) {
                    imagesToReturn.push({
                        ...thisPost.images[i],
                        createdAt: new Date(thisPost.images[i].createdAt)
                    })
                }

                return imagesToReturn
            })()
            postInput.value = {
                postId: thisPost.id,
                title: thisPost.title,
                heroImg: thisPost.heroImg || '',
                summary: thisPost.summary || '',
                content: thisPost.content || '',
                tags: thisPost.tags || [],
                published: thisPost.published
            }
        }

        currentUserFull = await $fetch<FullUser>('/api/user/getAllData')
    })
    // Watch the post inputs and enable save button if there's new input data and it's not saved
    watch([() => postInput.value], () => {
        if (!post.value) return
        
        hasChanges.value = 
            postInput.value.title !== post.value.title ||
            postInput.value.heroImg !== post.value.heroImg ||
            postInput.value.summary !== post.value.summary ||
            postInput.value.content !== post.value.content ||
            JSON.stringify(postInput.value.tags) !== JSON.stringify(post.value.tags) ||
            postInput.value.published !== post.value.published
    }, { deep: true })
    // Watch the autosave enabled input box and enable/disable it depending on its status
    watch(autoSaveEnabled, (newValue) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('autoSaveEnabled', newValue.toString())
        }
        if (newValue) {
            autoSaveInterval = setInterval(async () => {
                if (hasChanges.value) {
                    await savePost()
                }
            }, 30000)
        } else {
            clearInterval(autoSaveInterval)
        }
    })
    // The next few functions are literally either helpers or form submission stuff
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

    async function handleImageUpload(event: Event) {
        const input = event.target as HTMLInputElement
        const file = input.files?.[0]
        
        if (!file) return
        
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            imageError.value = 'Invalid file type'
            return
        }

        if (checkSize(file, 'new image', 15)) {
            imageError.value = 'File size must be less than 15MB'
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            pendingImage.value = {
                file,
                dataUrl: e.target?.result as string
            }
            showAltModal.value = true
        }
        reader.readAsDataURL(file)
    }
    // Changes DB
    async function confirmImageUpload() {
        if (!pendingImage.value || !pendingAlt.value.trim()) {
            imageError.value = 'Alt text is required'
            return
        }

        if (currentUserFull && currentUserFull.frozen) {
            error.value = 'You can\'t do this. Your account is currently frozen.'
            return
        }

        try {
            const newImage = await $fetch('/api/blog/posts/images/create', {
                method: 'POST',
                body: {
                    postId: post.value?.id,
                    image: pendingImage.value.dataUrl,
                    alt: pendingAlt.value
                }
            })
            
            images.value.push({
                ...newImage,
                createdAt: new Date(newImage.createdAt)
            })

            postInput.value.content += `\n[image:${newImage.id}:"${pendingAlt.value}"]\n`
            
            pendingImage.value = null
            pendingAlt.value = ''
            showAltModal.value = false
        } catch (e: any) {
            imageError.value = e.message
        }
    }

    async function handleThumbnailUpload(event: Event) {
        const input = event.target as HTMLInputElement
        const file = input.files?.[0]
        
        if (!file) return
        
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            imageError.value = 'Invalid file type'
            return
        }

        if (checkSize(file, 'new image', 15)) {
            imageError.value = 'File size must be less than 15MB'
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            postInput.value.heroImg = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }
    // Changes DB
    async function updateAltText(imageId: string, newAlt: string | null) {
        try {

            if (currentUserFull && currentUserFull.frozen) {
                error.value = 'You can\'t do this. Your account is currently frozen.'
                return
            }
            
            // Update in database
            await $fetch('/api/blog/posts/images/update', {
                method: 'POST',
                body: {
                    imageId,
                    alt: newAlt
                }
            })

            // Update local image data
            const imageToUpdate = images.value.find(img => img.id === imageId)
            if (imageToUpdate) {
                imageToUpdate.alt = newAlt
            }

            // Update content markers
            const markerRegex = new RegExp(`\\[image:${imageId}:"[^"]*"\\]`, 'g')
            postInput.value.content = postInput.value.content.replace(
                markerRegex,
                `[image:${imageId}:"${newAlt}"]`
            )

            editingImageId.value = null
            newAltText.value = ''
        } catch (e: any) {
            error.value = e.message
        }
    }
    // Changes DB
    async function deleteImage(imageId: string, imageAlt: string | null) {
        try {
            await $fetch('/api/blog/posts/images/delete', {
                method: 'POST',
                body: { imageId }
            })
            images.value = images.value.filter(img => img.id !== imageId)
            postInput.value.content = postInput.value.content.replace(`[image:${imageId}:"${imageAlt}"]`, '')
        } catch (e: any) {
            error.value = e.message
        }
    }

    async function copyToClipboard(text: string) {
        text = text.replaceAll('[QUOTE]', '"')

        try {
            await window.navigator.clipboard.writeText(text)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    function validateInput(postInput: any): string {        
        const heroImgTooBig = checkSize(postInput.heroImg, 'post heroImg', 15)
        const contentTooBig = checkSize(postInput.content, 'post content', 15)

        if (heroImgTooBig) {
            return heroImgTooBig
        } else if (contentTooBig) {
            return contentTooBig
        } else {
            return ''
        }
    }
    // Changes DB
    async function savePost() {
        try {
            loading.value = true
            error.value = ''

            if (currentUserFull && currentUserFull.frozen) {
                error.value = 'You can\'t do this. Your account is currently frozen.'
                return
            }

            postInput.value.title = postInput.value.title.trim()
            postInput.value.heroImg = postInput.value.heroImg.trim()
            postInput.value.summary = postInput.value.summary.trim()
            postInput.value.content = postInput.value.content.trim()
            for (let i=0;i<postInput.value.tags.length;i++) {
                postInput.value.tags[i] = postInput.value.tags[i].trim()
            }

            error.value = await validateInput(postInput.value)

            if (error.value != '') {
                return
            }

            const updatedPost = await $fetch('/api/blog/posts/update', {
                method: 'POST',
                body: postInput.value
            })

            post.value = {
                ...updatedPost,
                createdAt: new Date(updatedPost.createdAt),
                updatedAt: new Date(updatedPost.updatedAt)
            }

            hasChanges.value = false
        } catch (e: any) {
            error.value = e.message
        } finally {
            loading.value = false
        }
    }
    // Cleans interval
    onUnmounted(() => {
        clearInterval(autoSaveInterval)
    })
</script>

<template>
    <appNav />
    
    <div v-if="error">{{ error }}</div>
    
    <form @submit.prevent="savePost" v-if="post">
        <div>
            <label>Title</label>
            <input v-model="postInput.title" type="text" maxlength="100" />
        </div>

        <div>
            <label>Thumbnail</label>
            <img width="100px" v-if="post.heroImg" :src="post.heroImg" alt="">
            <input 
                type="file" 
                accept="image/*"
                @change="handleThumbnailUpload"
            />
            <div v-if="imageError">{{ imageError }}</div>
        </div>
        
        <div>
            <label>Summary</label>
            <input v-model="postInput.summary" type="text" maxlength="250" />
        </div>

        <div>
            <label>Tags (comma-separated)</label>
            <input 
                type="text" 
                :value="postInput.tags.join(',')"
                @input="(e) => postInput.tags = (e.target as HTMLInputElement).value.split(',')"
                maxlength="250"
            />
        </div>

        <div>
            <label>Content</label>
            <textarea 
                v-model="postInput.content" 
                rows="20"
                placeholder="Write your post content here. Use the given image markers to place images."
            ></textarea>
        </div>

        <div>
            <label>Upload Images</label>
            <input 
                type="file" 
                accept="image/*"
                @change="handleImageUpload"
            />
            <div v-if="imageError">{{ imageError }}</div>
        </div>

        <div v-if="showAltModal">
            <div>
                <h3>Add Alt Text</h3>
                <img 
                    v-if="pendingImage" 
                    :src="pendingImage.dataUrl" 
                    alt="Preview" 
                    style="max-width: 200px"
                />
                <input 
                    v-model="pendingAlt"
                    type="text"
                    placeholder="Describe this image (required)"
                    required
                />
                <div>
                    <button @click="showAltModal = false">Cancel</button>
                    <button 
                        @click="confirmImageUpload"
                        :disabled="!pendingAlt.trim()"
                    >
                        Upload Image
                    </button>
                </div>
            </div>
        </div>

        <div>
            <div v-for="img in images" :key="img.id">
                <img :src="img.image" :alt="img.alt || ''" width="200" />
                <div>Marker: [image:{{ img.id }}:"{{ img.alt }}"]</div>
                
                <div v-if="editingImageId === img.id">
                    <input 
                        v-model="newAltText"
                        type="text" 
                        placeholder="New alt text"
                    />
                    <button @click="updateAltText(img.id, newAltText)">Save</button>
                    <button @click="editingImageId = null">Cancel</button>
                </div>
                
                <div v-else>
                    <button @click="copyToClipboard(`[image:${img.id}:[QUOTE]${img.alt}[QUOTE]]`)">
                        Copy Marker
                    </button>
                    <button @click="editingImageId = img.id;newAltText = img.alt">
                        Edit Alt Text
                    </button>
                    <button @click="deleteImage(img.id, img.alt)">Delete</button>
                </div>
            </div>
        </div>

        <!-- autosave toggle wooh -->
        <div>
            <label>
                <input 
                    type="checkbox"
                    v-model="autoSaveEnabled"
                />
                Auto-save every 30 seconds
            </label>
        </div>

        <div>
            <label>
                <input 
                    type="checkbox" 
                    v-model="postInput.published"
                />
                Publish Post
            </label>
        </div>

        <button type="submit" :disabled="loading || !hasChanges">
            {{ loading ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved' }}
        </button>
    </form>
</template>