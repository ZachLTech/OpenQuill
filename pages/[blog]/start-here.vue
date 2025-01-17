<script setup lang="ts">
import { useDropZone } from "@vueuse/core";
// Types
type User = {
	name: string;
	email: string;
	image: string;
	id: string;
};
// All initial logic declarations
const { status, data } = useAuth();
const route = useRoute();
const loading = ref(true);
const error = ref("");
const initializing = ref(true);
const thisUserData = data.value?.user;
const dropZoneRef = ref<HTMLDivElement>();
const tagInput = ref<HTMLInputElement | null>(null);
const STORAGE_KEY = `blog-draft-${route.params.blog}`;
const blogInput = ref({
	blogTitle: route.params.blog as string,
	blogDescription: "",
	blogImage: "",
	blogTags: [] as string[],
});
const { isOverDropZone } = useDropZone(dropZoneRef, {
	onDrop,
	dataTypes: [
		"image/jpeg",
		"image/JPEG",
		"image/JPG",
		"image/PNG",
		"image/GIF",
		"image/WEBP",
		"image/jpg",
		"image/png",
		"image/gif",
		"image/webp",
	],
	multiple: false,
	preventDefaultForUnhandled: false,
});

let step = ref(1);
// If the user isn't even authenticated then they getting booted straight back to login
if (status.value === "unauthenticated") {
	navigateTo("/login");
}
// Runs this as soon as the page is mounted - gets blog data  and makes sure it's not already initialized nor is the person trying to access it unauthorized
onMounted(async () => {
	try {
		loading.value = true;
		const blogData = await $fetch("/api/blog/getData", {
			method: "POST",
			body: {
				blogTitle: route.params.blog,
			},
		});

		if (
			blogData &&
			!blogData.description &&
			!blogData.imageURL &&
			!blogData.tags?.length
		) {
			loadDraft();
		}

		if (!blogData) {
			navigateTo("/");
			return;
		} else if ((thisUserData as User).id != blogData.ownerId) {
			navigateTo(`/${blogData.title}`);
			return;
		}

		if (
			blogData.description ||
			blogData.imageURL ||
			blogData.tags?.length > 0
		) {
			navigateTo(`/${blogData.title}`);
			return;
		}

		initializing.value = true;
	} catch (e: any) {
		error.value = e?.response?._data?.message || "Failed to load blog";
		console.error("Blog loading error:", e);
	} finally {
		loading.value = false;
	}
});
// Watch for changes and save draft
watch(
	[() => blogInput.value, step],
	() => {
		saveDraft();
	},
	{ deep: true }
);
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
			return "";
		} catch (e) {
			console.error(`ERROR: ${e}`);
			return `Something went wrong while checking input size...`;
		}
	}
	return "";
}

const saveDraft = () => {
	if (typeof window !== "undefined") {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				blogInput: blogInput.value,
				step: step.value,
			})
		);
	}
};

const loadDraft = () => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			const data = JSON.parse(saved);
			blogInput.value = data.blogInput;
			step.value = data.step;
		}
	}
};

const clearDraft = () => {
	if (typeof window !== "undefined") {
		localStorage.removeItem(STORAGE_KEY);
	}
};

function handleTagInput(event: Event) {
	const target = event.target as HTMLInputElement;
	const value = target.value;

	if (!value) return;

	if (value.includes(",")) {
		const newTags = value
			.split(",")
			.map((tag) => tag.trim())
			.filter((tag) => tag && !blogInput.value.blogTags.includes(tag));

		if (newTags.length > 0) {
			blogInput.value.blogTags.push(...newTags);
		}

		target.value = "";
	}
}

function handleTagKeydown(event: KeyboardEvent) {
	const target = event.target as HTMLInputElement;
	const value = target.value.trim();

	if (event.key === "," && value) {
		event.preventDefault();
		if (!blogInput.value.blogTags.includes(value)) {
			blogInput.value.blogTags.push(value);
		}
		target.value = "";
	}
}

function handleDragOver(event: DragEvent) {
	event.preventDefault();
	event.stopPropagation();
}

function validateInput(blogInput: any): string {
	const descriptionTooBig = checkSize(
		blogInput.blogDescription,
		"blog description",
		15
	);
	const tagsTooBig = checkSize(
		blogInput.blogTags,
		"total blog tag size",
		0.001
	);

	if (descriptionTooBig) {
		return descriptionTooBig;
	} else if (tagsTooBig) {
		return tagsTooBig;
	} else {
		return "";
	}
}

async function onDrop(files: File[] | null) {
	error.value = "";
	const allowedFiletypes = [
		"image/jpeg",
		"image/JPEG",
		"image/JPG",
		"image/PNG",
		"image/GIF",
		"image/WEBP",
		"image/jpg",
		"image/png",
		"image/gif",
		"image/webp",
	];

	if (!files || files.length === 0) return;

	const file = files[0];

	if (!allowedFiletypes.includes(file.type)) {
		error.value = `Please upload a valid image file (JPEG, PNG, WEBP, or GIF)`;
		return;
	}

	if (file.size >= 15 * 1024 * 1024) {
		error.value = "File size cannot exceed 15MB.";
		return;
	}

	const reader = new FileReader();
	reader.onload = (e) => {
		blogInput.value.blogImage = e.target?.result as string;
	};
	reader.readAsDataURL(file);
}

function handleDrop(event: DragEvent) {
	event.preventDefault();
	event.stopPropagation();

	const files = event.dataTransfer?.files;
	if (files && files.length > 0) {
		handleFileUpload({ target: { files: files } } as unknown as Event);
	}
}

async function handleFileUpload(event: Event) {
	error.value = "";
	const allowedFiletypes = [
		"image/jpeg",
		"image/JPEG",
		"image/JPG",
		"image/PNG",
		"image/GIF",
		"image/WEBP",
		"image/jpg",
		"image/png",
		"image/gif",
		"image/webp",
	];
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];

	if (!file) return;

	if (!allowedFiletypes.includes(file.type)) {
		error.value = `Please upload a valid image file (JPEG, PNG, WEBP, or GIF)`;
		return;
	}

	if (file.size >= 15 * 1024 * 1024) {
		error.value = "File size cannot exceed 15MB.";
		return;
	}

	const reader = new FileReader();
	reader.onload = (e) => {
		blogInput.value.blogImage = e.target?.result as string;
	};
	reader.readAsDataURL(file);
}
// Changes DB
async function handleInitialize() {
	try {
		loading.value = true;
		error.value = "";

		blogInput.value.blogDescription =
			blogInput.value.blogDescription.trim();
		blogInput.value.blogImage = blogInput.value.blogImage.trim();
		for (let i = 0; i < blogInput.value.blogTags.length; i++) {
			blogInput.value.blogTags[i] = blogInput.value.blogTags[i].trim();
		}

		error.value = await validateInput(blogInput.value);

		if (error.value != "") {
			return;
		}

		const data = await $fetch("/api/blog/update", {
			method: "POST",
			body: blogInput.value,
		});

		if (data) {
			clearDraft();
			initializing.value = false;
		}
	} catch (e: any) {
		error.value =
			e?.response?._data?.message || "Failed to initialize blog";
		console.error("Blog initialization error:", e);
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<div v-if="error" class="p-4 w-screen flex justify-center absolute">
		<div class="w-full p-4 rounded-lg bg-red-500 sm:bg-opacity-20 flex">
			<button @click="error = ''" class="flex-shrink-0">
				<svg
					class="h-5 w-5 sm:text-red-400"
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
				<h3 class="text-sm font-medium sm:text-red-400">{{ error }}</h3>
			</div>
		</div>
	</div>

	<div
		v-if="loading"
		class="flex justify-center items-center w-screen h-[95vh]"
	>
		<div
			class="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-primary"
		></div>
	</div>

	<div v-else-if="initializing">
		<form
			@submit.prevent="handleInitialize"
			class="w-screen h-screen flex justify-center pt-12 sm:pt-0 sm:items-center"
		>
			<div
				v-if="step == 1"
				class="sm:h-[60vh] flex flex-col items-center sm:items-baseline"
			>
				<h1
					class="text-3xl text-center font-extrabold tracking-tight text-text self-center sm:text-4xl"
				>
					Let's spiffy up your blog a little 😉
				</h1>
				<label
					for="description"
					class="mt-[5vh] mb-2 text-lg text-secondary opacity-15"
					>Add a Blog Description</label
				>
				<textarea
					id="description"
					v-model="blogInput.blogDescription"
					class="w-[85vw] sm:w-[45vw] h-full sm:h-[40vh] p-4 bg-secondary border-0 bg-opacity-5 rounded-lg placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20 text-text text-lg resize-y min-h-[100px] max-h-[400px] focus:outline-none"
					type="text"
					placeholder="Describe your blog... What's it about? What can readers expect?"
					:disabled="loading"
				/>
			</div>
			<div
				v-if="step == 2"
				class="sm:h-[60vh] flex flex-col items-center sm:items-baseline"
			>
				<h1
					class="text-3xl text-center font-extrabold tracking-tight text-text sm:text-4xl self-center"
				>
					How about a banner image for your blog 🤨
				</h1>
				<label
					for="description"
					class="mt-[5vh] mb-2 text-lg text-secondary opacity-15 flex items-center"
					>Add a Blog Banner Image (Optional)
					<button
						v-if="blogInput.blogImage"
						@click.prevent="blogInput.blogImage = ''"
						class="p-1 rounded-full"
					>
						<svg
							class="w-5 h-5 text-text hover:text-red-400 transition-colors"
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
				</label>
				<input
					type="file"
					ref="dropZoneRef"
					accept="image/*"
					class="hidden"
					id="fileInput"
					:disabled="loading"
					@change="handleFileUpload"
					placeholder="Blog Header Image URL"
				/>
				<label
					for="fileInput"
					class="flex justify-center items-center w-[90vw] sm:w-[45vw] h-[50vh] sm:h-[40vh] p-4 bg-secondary bg-opacity-5 border-2 border-dashed border-secondary border-opacity-25 rounded-lg text-center cursor-pointer hover:border-opacity-50 transition-all"
					@dragover="handleDragOver"
					@drop="handleDrop"
				>
					<div
						v-if="!blogInput.blogImage"
						class="h-full flex flex-col items-center justify-center"
					>
						<svg
							class="w-16 h-16 mb-4 text-secondary opacity-50"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
							/>
						</svg>
						<span class="text-secondary text-lg opacity-50"
							>Click to upload or drag and drop</span
						>
						<span class="text-md text-secondary opacity-40 mt-2"
							>JPEG, PNG, WEBP or GIF (max. 15MB)</span
						>
					</div>
					<img
						v-if="blogInput.blogImage"
						:src="blogInput.blogImage"
						alt="Preview"
						class="w-[90%] h-[90%] rounded"
					/>
				</label>
			</div>
			<div
				v-if="step == 3"
				class="h-[60vh] flex flex-col items-center sm:items-baseline"
			>
				<div class="flex flex-col items-center sm:items-baseline">
					<h1
						class="text-3xl text-center font-extrabold tracking-tight text-text sm:text-4xl self-center"
					>
						Now some tags to make your blog unique 🏷️
					</h1>
					<label
						for="description"
						class="mt-[5vh] mb-2 text-lg text-secondary opacity-15"
						>Add some Blog Tags (Optional)</label
					>
					<div
						class="relative w-[85vw] sm:w-[45vw] min-h-[50px] p-2 bg-secondary bg-opacity-5 rounded-lg flex flex-wrap gap-2 items-center"
					>
						<span
							v-for="(tag, index) in blogInput.blogTags"
							:key="index"
							class="bg-secondary bg-opacity-5 text-text px-3 py-1 rounded flex items-center gap-2"
						>
							{{ tag }}
							<button
								@click="blogInput.blogTags.splice(index, 1)"
								type="button"
								class="hover:text-red-400 transition-colors text-xs"
							>
								✕
							</button>
						</span>
						<input
							ref="tagInput"
							@input="handleTagInput"
							@keydown="handleTagKeydown"
							type="text"
							class="flex-grow bg-transparent border-none focus:outline-none text-text p-2 focus:ring-secondary focus:ring-opacity-20 rounded"
							placeholder="Type tags and press comma to add..."
							:disabled="loading"
						/>
					</div>
				</div>
			</div>
			<div
				v-if="step == 4"
				class="h-[60vh] flex flex-col items-center mt-[20vh] sm:mt-0"
			>
				<h1
					class="text-3xl text-center font-extrabold tracking-tight text-text sm:text-4xl"
				>
					Almost There ❗❗
				</h1>
				<p
					class="max-w-[90%] sm:max-w-full text-lg text-center text-secondary opacity-70 mt-8 mb-8"
				>
					Ready to create your blog? Click below to finish setup!
				</p>
				<button
					type="submit"
					:disabled="loading"
					class="w-[90%] sm:w-full py-4 bg-primary text-lg font-medium rounded-lg hover:bg-opacity-90 transition-all disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
				>
					{{ loading ? "Processing..." : "Initialize Blog" }}
				</button>
			</div>
			<div
				class="absolute flex items-center gap-4 sm:gap-12 -bottom-10 sm:bottom-10"
			>
				<button
					type="button"
					@click="step--"
					class="py-3 px-8 border text-gray-400 border-primary rounded hover:border-opacity-70 disabled:border-gray-600 disabled:hover:cursor-not-allowed transition-all"
					:disabled="step == 1"
				>
					Back
				</button>
				<div class="flex h-full gap-4">
					<div
						class="h-4 w-4 rounded-full bg-secondary bg-opacity-25"
					>
						<div
							v-if="step == 1"
							class="w-full h-full bg-primary border-4 border-gray-700 rounded-full"
						></div>
					</div>
					<div
						class="h-4 w-4 rounded-full bg-secondary bg-opacity-25"
					>
						<div
							v-if="step == 2"
							class="w-full h-full bg-primary border-4 border-gray-700 rounded-full"
						></div>
					</div>
					<div
						class="h-4 w-4 rounded-full bg-secondary bg-opacity-25"
					>
						<div
							v-if="step == 3"
							class="w-full h-full bg-primary border-4 border-gray-700 rounded-full"
						></div>
					</div>
					<div
						class="h-4 w-4 rounded-full bg-secondary bg-opacity-25"
					>
						<div
							v-if="step == 4"
							class="w-full h-full bg-primary border-4 border-gray-700 rounded-full"
						></div>
					</div>
				</div>

				<button
					type="button"
					@click="step++"
					class="py-3 px-8 bg-primary rounded hover:bg-opacity-90 disabled:bg-gray-600 disabled:text-gray-400 disabled:hover:cursor-not-allowed transition-all"
					:disabled="step == 4"
				>
					Next
				</button>
			</div>
		</form>
	</div>

	<div
		v-else
		class="flex flex-col items-center justify-center h-screen space-y-8 animate-fadeIn overflow-hidden"
	>
		<div
			v-for="n in 20"
			:key="n"
			class="confetti-piece"
			:style="{
				left: `${Math.random() * 100}%`,
				top: '-65px',
				background: `hsl(${Math.random() * 360}, 70%, 50%)`,
				animationDelay: `${Math.random() * 3}s`,
			}"
		></div>
		<h2 class="text-3xl sm:text-4xl font-bold text-text animate-bounce">
			🎉 Your Blog is Ready! 🎉
		</h2>
		<NuxtLink
			:to="`/${blogInput.blogTitle}`"
			class="px-8 py-4 text-xl font-semibold text-text bg-primary rounded-lg hover:bg-opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
		>
			Visit Your New Blog
		</NuxtLink>
	</div>
</template>

<style>
@keyframes confetti {
	0% {
		transform: translateY(0) rotate(0deg);
		opacity: 1;
	}
	100% {
		transform: translateY(100vh) rotate(720deg);
		opacity: 0;
	}
}
.confetti-piece {
	position: absolute;
	width: 10px;
	height: 30px;
	background: #ffd700;
	top: -10px;
	animation: confetti 3s ease-in-out infinite;
}
.animate-fadeIn {
	animation: fadeIn 1s ease-in;
}
@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(-20px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
