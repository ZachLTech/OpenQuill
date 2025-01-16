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
    const pendingAlt = ref<string | null>('')
    const editingImageId = ref<string | null>(null)
    const newAltText = ref<string | null>('')
    const hasChanges = ref(false)
    const currentSessionUser = data.value?.user
    const autoSaveEnabled = ref(true)
    const isEditing = ref(false)
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

    function replaceImageMarkers(content: string): string {
        const markerRegex = /\[image:([^:]+):"([^"]+)"\]/g;
        const markdownContent = content.replace(markerRegex, (match, imageId, alt) => {
            const image = images.value.find(img => img.id === imageId);
            if (image) {
                return `<img src="${image.image}" alt="${alt}" class="my-4">`;
            }
            return '';
        });
        
        return markdownContent;
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
        if (!pendingImage.value || !pendingAlt.value || !pendingAlt.value.trim()) {
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
            
            await $fetch('/api/blog/posts/images/update', {
                method: 'POST',
                body: {
                    imageId,
                    alt: newAlt
                }
            })

            const imageToUpdate = images.value.find(img => img.id === imageId)
            if (imageToUpdate) {
                imageToUpdate.alt = newAlt
            }

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

    async function editAltText(imageId: string, currentAlt: string | null) {
        isEditing.value = true
        showAltModal.value = true
        pendingAlt.value = currentAlt
        editingImageId.value = imageId
    }

    async function updateImageAlt() {
        try {
            loading.value = true
            await $fetch('/api/blog/posts/images/update', {
                method: 'POST',
                body: {
                    imageId: editingImageId.value,
                    alt: pendingAlt.value
                }
            })
            
            const imageIndex = images.value.findIndex(img => img.id === editingImageId.value)
            if (imageIndex !== -1) {
                images.value[imageIndex].alt = pendingAlt.value
            }
            
            showAltModal.value = false
            isEditing.value = false
            editingImageId.value = null
            pendingAlt.value = ''
        } catch (e: any) {
            error.value = e?.response?._data?.message || 'Failed to update alt text'
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
    
    <div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div class="max-w-5xl mx-auto">
            <!-- Error Display -->
            <div v-if="error" class="mb-6 p-4 rounded-lg bg-red-500 bg-opacity-20">
                <p class="text-sm text-red-400">{{ error }}</p>
            </div>

            <form @submit.prevent="savePost" class="space-y-8">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Editor Section -->
                    <div class="space-y-6">
                        <div>
                            <input 
                                v-model="postInput.title" 
                                type="text"
                                placeholder="Post Title"
                                class="w-full p-4 bg-secondary bg-opacity-5 border-0 rounded-lg text-xl font-semibold text-text placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20"
                                maxlength="100"
                            />
                        </div>

                        <div>
                            <input 
                                v-model="postInput.summary"
                                type="text"
                                placeholder="Brief summary of your post"
                                class="w-full p-4 bg-secondary bg-opacity-5 border-0 rounded-lg text-text placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20"
                                maxlength="250"
                            />
                        </div>

                        <div>
                            <input 
                                type="text" 
                                :value="postInput.tags.join(',')"
                                @input="(e) => postInput.tags = (e.target as HTMLInputElement).value.split(',')"
                                placeholder="Tags (comma-separated)"
                                class="w-full p-4 bg-secondary bg-opacity-5 border-0 rounded-lg text-text placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20"
                                maxlength="250"
                            />
                        </div>

                        <!-- Hero Image Section -->
                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-secondary opacity-70">Post Thumbnail</label>
                            <div class="relative">
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    @change="handleThumbnailUpload"
                                    class="hidden"
                                    id="thumbnail"
                                />
                                <label 
                                    for="thumbnail"
                                    class="flex items-center justify-center w-full h-40 border-2 border-dashed border-secondary border-opacity-25 rounded-lg hover:border-opacity-50 cursor-pointer transition-all"
                                >
                                    <img 
                                        v-if="postInput.heroImg" 
                                        :src="postInput.heroImg" 
                                        alt="Thumbnail"
                                        class="w-full h-full object-cover rounded-lg"
                                    >
                                    <div v-else class="text-center">
                                        <svg class="mx-auto h-12 w-12 text-secondary opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p class="mt-1 text-sm text-secondary opacity-40">Click to upload thumbnail</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- Content Editor -->
                        <div class="min-h-[400px]">
                            <textarea 
                                v-model="postInput.content" 
                                rows="20"
                                placeholder="Write your post content here using Markdown. Use the given image markers to place images."
                                class="w-full p-4 bg-transparent border-0 text-text placeholder-secondary placeholder-opacity-25 focus:ring-0 focus:outline-none resize-none"
                            ></textarea>
                        </div>
                    </div>

                    <!-- Preview Section -->
                    <div class="lg:border-l lg:border-secondary lg:border-opacity-10 lg:pl-8">
                        <div class="sticky top-8">
                            <h2 class="text-lg font-semibold text-text mb-4">Preview</h2>
                            <div 
                                class="prose prose-invert prose-sm sm:prose-base max-w-none"
                                v-html="replaceImageMarkers(postInput.content || '')"
                            ></div>
                        </div>
                    </div>
                </div>

                <!-- Image Management -->
                <div class="space-y-4 pt-8 border-t border-secondary border-opacity-10">
                    <h3 class="text-lg font-medium text-text">Images</h3>
                    
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div v-for="img in images" :key="img.id" class="relative group">
                            <img :src="img.image" :alt="img.alt || ''" class="w-full aspect-square object-cover rounded-lg" />
                            <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                                <button 
                                    @click="copyToClipboard(`[image:${img.id}:[QUOTE]${img.alt}[QUOTE]]`)"
                                    class="p-2 bg-secondary bg-opacity-20 rounded hover:bg-opacity-30 transition-all"
                                >
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                </button>
                                <button 
                                    @click="editAltText(img.id, img.alt)"
                                    class="p-2 bg-secondary bg-opacity-20 rounded hover:bg-opacity-30 transition-all"
                                >
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button 
                                    @click="deleteImage(img.id, img.alt)"
                                    class="p-2 bg-red-500 bg-opacity-20 rounded hover:bg-opacity-30 transition-all"
                                >
                                    <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <!-- Upload New Image -->
                        <div>
                            <input 
                                type="file" 
                                accept="image/*"
                                @change="handleImageUpload"
                                class="hidden"
                                id="newImage" 
                            />
                            <label 
                                for="newImage"
                                class="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-secondary border-opacity-25 rounded-lg hover:border-opacity-50 cursor-pointer transition-all"
                            >
                                <svg class="w-8 h-8 text-secondary opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span class="mt-2 text-sm text-secondary opacity-40">Add Image</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Controls -->
                <div class="sticky bottom-0 bg-bg py-4 border-t border-secondary border-opacity-10">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <label class="flex items-center space-x-2 text-sm text-secondary opacity-70">
                                <input 
                                    type="checkbox"
                                    v-model="autoSaveEnabled"
                                    class="rounded border-secondary border-opacity-25 bg-secondary bg-opacity-5 text-primary focus:ring-primary"
                                />
                                <span>Auto-save every 30 seconds</span>
                            </label>
                            <label class="flex items-center space-x-2 text-sm text-secondary opacity-70">
                                <input 
                                    type="checkbox" 
                                    v-model="postInput.published"
                                    class="rounded border-secondary border-opacity-25 bg-secondary bg-opacity-5 text-primary focus:ring-primary"
                                />
                                <span>Publish Post</span>
                            </label>
                        </div>
                        
                        <button 
                            type="submit" 
                            :disabled="loading || !hasChanges"
                            class="px-6 py-2 bg-primary text-text rounded-lg hover:bg-opacity-90 transition-all disabled:bg-opacity-50 disabled:cursor-not-allowed"
                        >
                            {{ loading ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved' }}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- Alt Text Modal -->
    <div v-if="showAltModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div class="bg-bg rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-medium text-text mb-4">
                {{ isEditing ? 'Edit Alt Text' : 'Add Alt Text' }}
            </h3>
            <img 
                v-if="pendingImage && !isEditing" 
                :src="pendingImage.dataUrl" 
                alt="Preview" 
                class="w-full h-48 object-cover rounded-lg mb-4"
            />
            <input 
                v-model="pendingAlt"
                type="text"
                :placeholder="isEditing ? 'Update image description' : 'Describe this image (required)'"
                required
                class="w-full p-4 bg-secondary bg-opacity-5 border-0 rounded-lg text-text placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20 mb-4"
            />
            <div class="flex justify-end space-x-4">
                <button 
                    @click="showAltModal = false; isEditing = false;"
                    class="px-4 py-2 text-secondary opacity-70 hover:opacity-100 transition-opacity"
                >
                    Cancel
                </button>
                <button 
                    @click="isEditing ? updateImageAlt() : confirmImageUpload()"
                    :disabled="!pendingAlt.trim()"
                    class="px-4 py-2 bg-primary text-text rounded-lg hover:bg-opacity-90 transition-all disabled:bg-opacity-50 disabled:cursor-not-allowed"
                >
                    {{ isEditing ? 'Update' : 'Upload Image' }}
                </button>
            </div>
        </div>
    </div>
</template>