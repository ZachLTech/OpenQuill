<script setup lang="ts">
import { useDropZone } from "@vueuse/core";

// Types
import { marked } from "marked";
import type { Post, Image, User as FullUser } from "@prisma/client";
type User = {
	id: string;
	email: string;
	name: string;
};
interface PendingImages {
	files: File[];
	currentIndex: number;
}
// All initial logic declarations
const { status, data } = useAuth();
const route = useRoute();
const loading = ref(false);
const error = ref("");
const imageError = ref("");
const post = ref<Post | null>(null);
const images = ref<Image[]>([]);
const showAltModal = ref(false);
const pendingImage = ref<{ file: File; dataUrl: string } | null>(null);
const pendingAlt = ref<string | null>("");
const editingImageId = ref<string | null>(null);
const hasChanges = ref(false);
const currentSessionUser = data.value?.user;
const isPreviewMode = ref(false);
const autoSaveEnabled = ref(true);
const isEditing = ref(false);
const contentRef = ref<HTMLTextAreaElement>();
const dropZoneActive = ref(false);
const thumbnailDropRef = ref<HTMLDivElement>();
const thumbnailDragActive = ref(false);

const { isOverDropZone: isThumbnailDropping } = useDropZone(thumbnailDropRef, {
	onDrop: (files) => handleThumbnailUpload(null, files),
	onEnter: () => (thumbnailDragActive.value = true),
	onLeave: () => (thumbnailDragActive.value = false),
});
const postInput = ref({
	postId: route.params.post as string,
	title: "",
	heroImg: "",
	summary: "",
	content: "",
	tags: [] as string[],
	published: false,
});
const pendingImages = ref<PendingImages>({
	files: [],
	currentIndex: 0,
});
let currentUserFull: FullUser;
let autoSaveInterval: NodeJS.Timeout;
let thumbnailVisible = ref(true);
// If the user isn't even authenticated then they getting booted back to the normal post
if (status.value != "authenticated") {
	navigateTo(`/${route.params.blog}/${route.params.post}`);
}
// Runs this as soon as the page is mounted - sets up autosave if a enabled, gets post data, makes sure the user is allowed to be there, and gets user
onMounted(async () => {
	loading.value = true;
	const savedPreference = localStorage.getItem("autoSaveEnabled");
	if (savedPreference !== null) {
		autoSaveEnabled.value = savedPreference === "true";
	}

	if (autoSaveEnabled.value) {
		autoSaveInterval = setInterval(async () => {
			if (hasChanges.value) {
				await savePost();
			}
		}, 30000);
	}
	const thisPost = await $fetch("/api/blog/posts/getData", {
		method: "POST",
		body: {
			postId: route.params.post,
		},
	});

	if (!thisPost) {
		navigateTo(`/${route.params.blog}`);
	} else if (
		thisPost.ownerId != (currentSessionUser as User).id &&
		thisPost.published
	) {
		navigateTo(`/${route.params.blog}/${route.params.post}`);
	} else if (thisPost.ownerId != (currentSessionUser as User).id) {
		navigateTo(`/${route.params.blog}`);
	} else {
		post.value = {
			...thisPost,
			createdAt: new Date(thisPost.createdAt),
			updatedAt: new Date(thisPost.updatedAt),
		};
		images.value = (() => {
			let imagesToReturn = [];

			for (let i = 0; i < thisPost.images.length; i++) {
				imagesToReturn.push({
					...thisPost.images[i],
					createdAt: new Date(thisPost.images[i].createdAt),
				});
			}

			return imagesToReturn;
		})();
		postInput.value = {
			postId: thisPost.id,
			title: thisPost.title,
			heroImg: thisPost.heroImg || "",
			summary: thisPost.summary || "",
			content: thisPost.content || "",
			tags: thisPost.tags || [],
			published: thisPost.published,
		};
	}

	currentUserFull = await $fetch<FullUser>("/api/user/getAllData");

	useSeoMeta({
		title: `Editing ${post.value?.title}` || 'Editing Blog Post',
		ogTitle: `Editing ${post.value?.title}` || 'Editing Blog Post',
		description: `Edit the ${post.value?.title} Post`,
		ogDescription: `Edit the ${post.value?.title} Post`,
		ogImage: `${post.value?.heroImg}`,
		twitterCard: 'summary_large_image',
	})
	loading.value = false;

	// nextTick(() => {
	//     setInitialHeight()
	// })
});
// Watch the post inputs and enable save button if there's new input data and it's not saved
watch(
	[() => postInput.value],
	() => {
		if (!post.value) return;

		hasChanges.value =
			postInput.value.title != post.value.title ||
			postInput.value.heroImg != post.value.heroImg ||
			postInput.value.summary != post.value.summary ||
			postInput.value.content != post.value.content ||
			JSON.stringify(postInput.value.tags) !=
				JSON.stringify(post.value.tags) ||
			postInput.value.published != post.value.published;
	},
	{ deep: true }
);
// Watch the autosave enabled input box and enable/disable it depending on its status
watch(autoSaveEnabled, (newValue) => {
	if (typeof window !== "undefined") {
		localStorage.setItem("autoSaveEnabled", newValue.toString());
	}
	if (newValue) {
		autoSaveInterval = setInterval(async () => {
			if (hasChanges.value) {
				await savePost();
			}
		}, 30000);
	} else {
		clearInterval(autoSaveInterval);
	}
});
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
			return "";
		} catch (e) {
			console.error(`ERROR: ${e}`);
			return `Something went wrong while checking input size...`;
		}
	}
	return "";
}

async function handleImageUpload(event: Event) {
	pendingAlt.value = "";
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];

	if (!file) return;

	const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
	if (!allowedTypes.includes(file.type)) {
		imageError.value = "Invalid file type";
		return;
	}

	if (checkSize(file, "new image", 15)) {
		imageError.value = "File size must be less than 15MB";
		return;
	}

	const reader = new FileReader();
	reader.onload = (e) => {
		pendingImage.value = {
			file,
			dataUrl: e.target?.result as string,
		};
		showAltModal.value = true;
	};
	reader.readAsDataURL(file);
}

async function handleThumbnailUpload(
	event: Event | null,
	droppedFiles?: File[] | null
) {
	let file: File | undefined;

	if (event) {
		const input = event.target as HTMLInputElement;
		file = input.files?.[0];
	} else if (droppedFiles?.length) {
		file = droppedFiles[0];
	}

	if (!file) return;

	const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
	if (!allowedTypes.includes(file.type)) {
		imageError.value = "Invalid file type";
		return;
	}

	if (checkSize(file, "new image", 15)) {
		imageError.value = "File size must be less than 15MB";
		return;
	}

	const reader = new FileReader();
	reader.onload = (e) => {
		postInput.value.heroImg = e.target?.result as string;
	};
	reader.readAsDataURL(file);
}
// Changes DB
async function deleteImage(imageId: string, imageAlt: string | null) {
	try {
		await $fetch("/api/blog/posts/images/delete", {
			method: "POST",
			body: { imageId },
		});
		images.value = images.value.filter((img) => img.id !== imageId);
		postInput.value.content = postInput.value.content.replace(
			`[image:${imageId}:"${imageAlt}"]`,
			""
		);
	} catch (e: any) {
		error.value = e.message;
	}
}

async function copyToClipboard(text: string) {
	text = text.replaceAll("[QUOTE]", '"');

	try {
		await window.navigator.clipboard.writeText(text);
	} catch (err) {
		console.error("Failed to copy:", err);
	}
}

function validateInput(postInput: any): string {
	const heroImgTooBig = checkSize(postInput.heroImg, "post heroImg", 15);
	const contentTooBig = checkSize(postInput.content, "post content", 15);

	if (heroImgTooBig) {
		return heroImgTooBig;
	} else if (contentTooBig) {
		return contentTooBig;
	} else {
		return "";
	}
}
// Changes DB
async function savePost() {
	try {
		loading.value = true;
		error.value = "";

		if (currentUserFull && currentUserFull.frozen) {
			error.value =
				"You can't do this. Your account is currently frozen.";
			return;
		}

		postInput.value.title = postInput.value.title.trim();
		postInput.value.heroImg = postInput.value.heroImg.trim();
		postInput.value.summary = postInput.value.summary.trim();
		postInput.value.content = postInput.value.content.trim();
		for (let i = 0; i < postInput.value.tags.length; i++) {
			postInput.value.tags[i] = postInput.value.tags[i].trim();
		}

		error.value = await validateInput(postInput.value);

		if (error.value != "") {
			return;
		}

		const updatedPost = await $fetch("/api/blog/posts/update", {
			method: "POST",
			body: postInput.value,
		});

		post.value = {
			...updatedPost,
			createdAt: new Date(updatedPost.createdAt),
			updatedAt: new Date(updatedPost.updatedAt),
		};

		hasChanges.value = false;
	} catch (e: any) {
		error.value = e.message;
	} finally {
		loading.value = false;
	}
}

async function editAltText(imageId: string, currentAlt: string | null) {
	isEditing.value = true;
	showAltModal.value = true;
	pendingAlt.value = currentAlt;
	editingImageId.value = imageId;
}

async function updateImageAlt() {
	try {
		loading.value = true;
		await $fetch("/api/blog/posts/images/update", {
			method: "POST",
			body: {
				imageId: editingImageId.value,
				alt: pendingAlt.value,
			},
		});

		const imageIndex = images.value.findIndex(
			(img) => img.id === editingImageId.value
		);
		if (imageIndex !== -1) {
			images.value[imageIndex].alt = pendingAlt.value;
		}

		showAltModal.value = false;
		isEditing.value = false;
		editingImageId.value = null;
		pendingAlt.value = "";
	} catch (e: any) {
		error.value =
			e?.response?._data?.message || "Failed to update alt text";
	} finally {
		loading.value = false;
	}
}

function handleGlobalDragOver(event: DragEvent) {
	event.preventDefault();
	event.stopPropagation();
	dropZoneActive.value = true;
}

function handleGlobalDragLeave(event: DragEvent) {
	event.preventDefault();
	event.stopPropagation();
	dropZoneActive.value = false;
}

function handleGlobalDrop(event: DragEvent) {
	event.preventDefault();
	event.stopPropagation();
	dropZoneActive.value = false;

	const files = event.dataTransfer?.files;
	if (!files?.length) return;

	const imageFiles = Array.from(files).filter((file) => {
		const validTypes = [
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/webp",
		];
		return validTypes.includes(file.type);
	});

	if (imageFiles.length === 0) {
		imageError.value = "Please upload valid image files only";
		return;
	}

	pendingImages.value = {
		files: imageFiles,
		currentIndex: 0,
	};

	showNextImagePrompt();
}

async function showNextImagePrompt() {
	const currentFile =
		pendingImages.value.files[pendingImages.value.currentIndex];

	if (!currentFile) {
		pendingImages.value = { files: [], currentIndex: 0 };
		return;
	}

	const reader = new FileReader();
	reader.onload = (e) => {
		pendingImage.value = {
			file: currentFile,
			dataUrl: e.target?.result as string,
		};
		showAltModal.value = true;
	};
	reader.readAsDataURL(currentFile);
}

async function confirmImageUpload() {
	if (currentUserFull && currentUserFull.frozen) {
		error.value = "You can't do this. Your account is currently frozen.";
		return;
	}

	if (!pendingImage.value || !pendingAlt.value?.trim()) {
		imageError.value = "Alt text is required";
		return;
	}

	try {
		const newImage = await $fetch("/api/blog/posts/images/create", {
			method: "POST",
			body: {
				postId: post.value?.id,
				image: pendingImage.value.dataUrl,
				alt: pendingAlt.value,
			},
		});

		images.value.push({
			...newImage,
			createdAt: new Date(newImage.createdAt),
		});

		if (contentRef.value?.selectionStart !== undefined) {
			const cursorPos = contentRef.value.selectionStart;
			const content = postInput.value.content;
			const imageMarker = `\n[image:${newImage.id}:"${pendingAlt.value}"]\n`;

			postInput.value.content =
				content.slice(0, cursorPos) +
				imageMarker +
				content.slice(cursorPos);
		} else {
			postInput.value.content += `[image:${newImage.id}:"${pendingAlt.value}"]`;
		}

		pendingImage.value = null;
		pendingAlt.value = "";
		showAltModal.value = false;

		pendingImages.value.currentIndex++;
		if (
			pendingImages.value.currentIndex < pendingImages.value.files.length
		) {
			showNextImagePrompt();
		}
	} catch (e: any) {
		imageError.value = e.message;
	}
}

function handleTagInput(event: Event) {
	const target = event.target as HTMLInputElement;
	const value = target.value;

	if (!value) return;

	if (value.includes(",")) {
		const newTags = value
			.split(",")
			.map((tag) => tag.trim())
			.filter((tag) => tag && !postInput.value.tags.includes(tag));
		if (newTags.length > 0) {
			postInput.value.tags = [...postInput.value.tags, ...newTags];
		}

		target.value = "";
	}
}

function removeTag(tag: string) {
	postInput.value.tags = postInput.value.tags.filter((t) => t !== tag);
}

function processContent() {
	let content = postInput.value.content;

	content = content.replace(/\[image:([^:]+):"([^"]+)"\]/g, (_, id, alt) => {
		const img = images.value.find((i) => i.id === id);
		return img ? `![${alt}](${img.image})` : "";
	});

	return marked(content, {
		breaks: true,
		gfm: true,
	});
}

// Cleans interval
onUnmounted(() => {
	clearInterval(autoSaveInterval);
});
</script>

<template>
	<appNav />

	<div v-if="error" class="p-4 w-full flex justify-center absolute z-10 top-15">
		<div
			class="w-full max-w-6xl p-4 rounded-lg bg-red-900 flex"
		>
			<button @click="error = ''" class="flex-shrink-0">
				<svg
					class="h-5 w-5 text-red-400"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
			<div class="ml-3">
				<p class="text-sm text-red-400">{{ error }}</p>
			</div>
		</div>
	</div>

	<div v-if="loading" class="flex justify-center items-center min-h-[400px]">
		<div
			class="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-primary"
		></div>
	</div>

	<div v-else-if="post" class="min-h-screen py-8 px-4 sm:px-6 lg:px-8 mt-16">
		<div class="max-w-6xl mx-auto">
			<form @submit.prevent="savePost" class="space-y-8">
				<div class="space-y-2">
					<div class="space-y-2">
						<div class="flex gap-2">
							<p class="ml-4 text-sm text-secondary opacity-40">
								Post Thumbnail
							</p>
							<button
								@click.prevent="
									thumbnailVisible = !thumbnailVisible
								"
								class="rounded-full"
							>
								<svg
									v-if="thumbnailVisible"
									class="w-5 h-5 text-secondary hover:opacity-30 opacity-40 transition-all"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
								<svg
									v-else
									class="w-5 h-5 text-secondary hover:opacity-30 opacity-40 transition-all"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
									/>
								</svg>
							</button>
							<button
								v-if="postInput.heroImg"
								@click.prevent="postInput.heroImg = ''"
								class="rounded-full"
							>
								<svg
									class="w-5 h-5 text-secondary opacity-40 hover:text-red-400 transition-colors"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
						</div>
						<div
							class="relative"
							ref="thumbnailDropRef"
							v-if="thumbnailVisible"
						>
							<input
								type="file"
								accept="image/*"
								@change="handleThumbnailUpload"
								class="hidden"
								id="thumbnail"
							/>
							<label
								for="thumbnail"
								class="flex items-center justify-center w-full h-[400px] border-2 border-dashed border-secondary border-opacity-25 rounded-lg hover:border-opacity-50 cursor-pointer transition-all"
							>
								<img
									v-if="postInput.heroImg"
									:src="postInput.heroImg"
									alt="Thumbnail"
									class="w-full h-full object-cover rounded-lg"
								/>
								<div v-else class="text-center flex flex-col">
									<svg
										class="mx-auto h-16 w-16 text-secondary opacity-40"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
									<span
										class="text-secondary text-lg opacity-50"
										>Click to upload or drag and drop</span
									>
									<span
										class="text-md text-secondary opacity-40"
										>JPEG, PNG, WEBP or GIF (max.
										15MB)</span
									>
								</div>
							</label>
						</div>
					</div>

					<div>
						<input
							v-model="postInput.title"
							type="text"
							placeholder="Post Title"
							class="w-full mt-4 p-4 pt-6 bg-transparent bg-opacity-5 border-0 text-xl font-semibold text-text placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-0 border-t border-t-secondary border-opacity-10 focus:border-t-secondary focus:border-opacity-10"
							maxlength="100"
						/>
					</div>

					<div>
						<input
							v-model="postInput.summary"
							type="text"
							placeholder="Brief summary of your post"
							class="w-full p-4 bg-transparent bg-opacity-5 border-0 text-lg text-text placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-0 border-b-2 border-b-secondary border-opacity-0 focus:border-b-transparent focus:border-opacity-50"
							maxlength="250"
						/>
					</div>

					<div>
						<div
							class="w-full p-4 pb-6 bg-transparent bg-opacity-5 border-0 text-lg text-text placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-0 border-b border-b-secondary border-opacity-10 focus:border-t-secondary focus:border-opacity-10 relative min-h-[50px] bg-secondary flex flex-wrap gap-2 items-center"
						>
							<span
								v-for="tag in postInput.tags"
								:key="tag"
								class="bg-secondary bg-opacity-5 text-text px-3 rounded flex items-center gap-2"
							>
								{{ tag }}
								<button
									@click="removeTag(tag)"
									type="button"
									class="hover:text-red-400 transition-colors text-xs"
								>
									✕
								</button>
							</span>
							<input
								type="text"
								@input="handleTagInput"
								class="flex-grow bg-transparent border-none placeholder-secondary placeholder-opacity-25 text-lg text-text focus:outline-none focus:border-none p-0 focus:ring-secondary focus:ring-opacity-0"
								placeholder="Type tags and press comma to add..."
								:disabled="loading"
							/>
						</div>
					</div>

					<div class="min-h-[400px]">
						<textarea
							v-if="!isPreviewMode"
							v-model="postInput.content"
							ref="contentRef"
							rows="25"
							placeholder="Write your post content here using Markdown. Use the given image markers to place images."
							@dragover="handleGlobalDragOver"
							@dragleave="handleGlobalDragLeave"
							@drop="handleGlobalDrop"
							class="w-full p-4 bg-transparent border-0 text-text placeholder-secondary placeholder-opacity-25 focus:ring-0 focus:outline-none resize-y min-h-[400px]"
						></textarea>
						<div
							v-else
							class="prose prose-invert max-w-none p-4 rounded-lg"
							v-html="processContent()"
						></div>
					</div>
					<p
						v-if="!isPreviewMode"
						class="ml-4 mt-1 text-sm text-secondary opacity-40"
					>
						Attach images by dragging & dropping into the text area
						or use the controls below.
					</p>
				</div>

				<div
					class="space-y-4 pt-8 border-t border-secondary border-opacity-10"
				>
					<h3 class="text-lg font-medium text-text">Images</h3>

					<div
						class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
					>
						<div
							v-for="img in images"
							:key="img.id"
							class="relative group"
						>
							<img
								:src="img.image"
								:alt="img.alt || ''"
								class="w-full aspect-square object-cover rounded-lg"
							/>
							<div
								class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg"
							>
								<button
									@click="
										copyToClipboard(
											`[image:${img.id}:[QUOTE]${img.alt}[QUOTE]]`
										)
									"
									class="p-2 bg-secondary bg-opacity-20 rounded hover:bg-opacity-30 transition-all"
								>
									<svg
										class="w-5 h-5 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
										/>
									</svg>
								</button>
								<button
									@click="editAltText(img.id, img.alt)"
									class="p-2 bg-secondary bg-opacity-20 rounded hover:bg-opacity-30 transition-all"
								>
									<svg
										class="w-5 h-5 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
										/>
									</svg>
								</button>
								<button
									@click="deleteImage(img.id, img.alt)"
									class="p-2 bg-red-500 bg-opacity-20 rounded hover:bg-opacity-30 transition-all"
								>
									<svg
										class="w-5 h-5 text-red-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
								</button>
							</div>
						</div>

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
								<svg
									class="w-8 h-8 text-secondary opacity-40"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 6v6m0 0v6m0-6h6m-6 0H6"
									/>
								</svg>
								<span
									class="mt-2 text-sm text-secondary opacity-40"
									>Add Image</span
								>
							</label>
						</div>
					</div>
				</div>

				<div
					class="sticky bottom-0 bg-bg py-4 border-t border-secondary border-opacity-10"
				>
					<div class="max-w-6xl mx-auto px-4">
						<div
							class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
						>
							<div
								class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto"
							>
								<button
									v-if="isPreviewMode"
									@click="isPreviewMode = false"
									class="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg transition-all text-center"
									:class="
										!isPreviewMode
											? 'bg-primary text-white'
											: 'bg-secondary bg-opacity-10 text-text hover:bg-opacity-20'
									"
								>
									Edit
								</button>
								<button
									v-if="!isPreviewMode"
									@click="isPreviewMode = true"
									class="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg transition-all text-center"
									:class="
										isPreviewMode
											? 'bg-primary text-white'
											: 'bg-secondary bg-opacity-10 text-text hover:bg-opacity-20'
									"
								>
									Preview
								</button>
								<label
									class="flex items-center space-x-2 text-sm text-secondary opacity-70"
								>
									<input
										type="checkbox"
										v-model="autoSaveEnabled"
										class="rounded border-secondary border-opacity-25 bg-secondary bg-opacity-5 text-primary focus:ring-primary"
									/>
									<span>Auto-save every 30 seconds</span>
								</label>
								<label
									class="flex items-center space-x-2 text-sm text-secondary opacity-70"
								>
									<input
										type="checkbox"
										v-model="postInput.published"
										class="rounded border-secondary border-opacity-25 bg-secondary bg-opacity-5 text-primary focus:ring-primary"
									/>
									<span>Publish Post</span>
								</label>
								<NuxtLink
									:to="`/${route.params.blog}/${route.params.post}`"
									v-if="post.published"
									class="px-4 py-2 bg-primary text-text rounded-lg hover:bg-opacity-90 transition-all disabled:bg-opacity-50 disabled:cursor-not-allowed"
								>
									View Post Page
								</NuxtLink>
							</div>
							<button
								type="submit"
								:disabled="loading || !hasChanges"
								class="px-6 py-2 bg-primary text-text rounded-lg hover:bg-opacity-90 transition-all disabled:bg-opacity-50 disabled:cursor-not-allowed"
							>
								{{
									loading
										? "Saving..."
										: hasChanges
										? "Save Changes"
										: "Saved"
								}}
							</button>
						</div>
					</div>
				</div>
			</form>
		</div>
	</div>

	<div
		v-if="showAltModal"
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
	>
		<div class="bg-bg rounded-lg p-6 max-w-md w-full">
			<h3 class="text-lg font-medium text-text mb-4">
				{{ isEditing ? "Edit Alt Text" : "Add Alt Text" }}
			</h3>
			<img
				v-if="pendingImage && !isEditing"
				:src="pendingImage.dataUrl"
				alt="Preview"
				class="w-full aspect-square object-cover rounded-lg mb-4"
			/>
			<input
				v-model="pendingAlt"
				type="text"
				:placeholder="
					isEditing
						? 'Update image description'
						: 'Describe this image (required)'
				"
				required
				class="w-full p-4 bg-secondary bg-opacity-5 border-0 rounded-lg text-text placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20 mb-4"
			/>
			<div class="flex justify-end space-x-4">
				<button
					@click="
						showAltModal = false;
						isEditing = false;
					"
					class="px-4 py-2 text-secondary opacity-70 hover:opacity-100 transition-opacity"
				>
					Cancel
				</button>
				<button
					@click="isEditing ? updateImageAlt() : confirmImageUpload()"
					:disabled="!pendingAlt.trim()"
					class="px-4 py-2 bg-primary text-text rounded-lg hover:bg-opacity-90 transition-all disabled:bg-opacity-50 disabled:cursor-not-allowed"
				>
					{{ isEditing ? "Update" : "Upload Image" }}
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
textarea {
	scrollbar-width: thin;
	scrollbar-color: #1e1f20;
}

textarea::-webkit-scrollbar {
	width: 8px;
}

textarea::-webkit-scrollbar-track {
	background: transparent;
}

textarea::-webkit-scrollbar-thumb {
	background-color: #1e1f20;
	border-radius: 4px;
}

textarea::-webkit-scrollbar-thumb:hover {
	background-color: rgba(var(--color-secondary), 0.3);
}

::-webkit-scrollbar {
	width: 12px;
	height: 12px;
}

::-webkit-scrollbar-track {
	background: #1e1f20;
	border-radius: 10px;
}

::-webkit-scrollbar-thumb {
	background: #1e1f20;
	border-radius: 10px;
	box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
	border: 2px solid #1e1f20;
}

::-webkit-scrollbar-thumb:hover {
	background: #1e1f20;
}
</style>
