<script setup lang="ts">
// Types
type Blog = {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	ownerId: string;
	title: string;
	description: string | null;
	imageURL: string | null;
	tags: string[];
	owner: {
		name: string;
		image: string | null;
		website: string | null;
	};
};
// All initial logic declarations
const props = defineProps<{
	blog: Blog;
}>();

const emit = defineEmits(["close", "update"]);
const dropZoneRef = ref<HTMLDivElement>();
const hasChanges = ref(false);

const formData = ref({
	title: props.blog.title,
	description: props.blog.description || "",
	imageURL: props.blog.imageURL || "",
	tags: props.blog.tags || [],
});

const originalBlog = ref({
	title: props.blog.title,
	description: props.blog.description || "",
	imageURL: props.blog.imageURL || "",
	tags: props.blog.tags || [],
});

const tagInput = ref<HTMLInputElement | null>(null);
const loading = ref(false);
const error = ref("");
// Watches for input changes and reacts
watch(
	formData,
	(newVal) => {
		hasChanges.value =
			newVal.title !== originalBlog.value.title ||
			newVal.description !== originalBlog.value.description ||
			newVal.imageURL !== originalBlog.value.imageURL ||
			JSON.stringify(newVal.tags) !==
				JSON.stringify(originalBlog.value.tags);
	},
	{ deep: true }
);
// Helper functions
function handleTagInput(event: Event) {
	const target = event.target as HTMLInputElement;
	const value = target.value;

	if (!value) return;

	if (value.includes(",")) {
		const newTags = value
			.split(",")
			.map((tag) => tag.trim())
			.filter((tag) => tag && !formData.value.tags.includes(tag));

		if (newTags.length > 0) {
			formData.value.tags.push(...newTags);
		}

		target.value = "";
	}
}

function handleTagKeydown(event: KeyboardEvent) {
	const target = event.target as HTMLInputElement;
	const value = target.value.trim();

	if (event.key === "," && value) {
		event.preventDefault();
		if (!formData.value.tags.includes(value)) {
			formData.value.tags.push(value);
		}
		target.value = "";
	}
}

function removeTag(tag: string) {
	formData.value.tags = formData.value.tags.filter((t) => t !== tag);
}

function handleDragOver(event: DragEvent) {
	event.preventDefault();
	event.stopPropagation();
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
		formData.value.imageURL = e.target?.result as string;
	};
	reader.readAsDataURL(file);
}

async function handleSubmit() {
	try {
		loading.value = true;
		const response = await $fetch("/api/blog/update", {
			method: "POST",
			body: {
				blogTitle: formData.value.title,
				blogDescription: formData.value.description,
				blogImage: formData.value.imageURL,
				blogTags: formData.value.tags,
			},
		});
		emit("update", response);
		emit("close");
	} catch (e: any) {
		error.value = e.message || "Failed to update blog";
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<div class="bg-secondary bg-opacity-5 rounded-xl p-6">
		<form @submit.prevent="handleSubmit" class="space-y-6">
			<div>
				<label
					for="title"
					class="block text-sm font-medium text-text mb-2"
				>
					Blog Title
				</label>
				<input
					id="title"
					v-model="formData.title"
					type="text"
					required
					class="w-full px-4 py-2 rounded-lg bg-secondary bg-opacity-10 text-text placeholder-gray-400 border-2 border-secondary border-opacity-10 focus:outline-none focus:ring-0 focus:border-secondary focus:border-opacity-20"
					placeholder="Enter blog title"
				/>
			</div>

			<div>
				<label
					for="description"
					class="block text-sm font-medium text-text mb-2"
				>
					Description
				</label>
				<textarea
					id="description"
					v-model="formData.description"
					rows="6"
					class="w-full px-4 py-2 rounded-lg bg-secondary bg-opacity-10 text-text placeholder-gray-400 border-2 border-secondary border-opacity-10 focus:outline-none focus:ring-0 focus:border-secondary focus:border-opacity-20"
					placeholder="Enter blog description"
				></textarea>
			</div>

			<label class="flex items-center text-sm font-medium text-text mb-2"
				>Blog Image
				<button
					v-if="formData.imageURL"
					@click.prevent="formData.imageURL = ''"
					class="p-1 rounded-full"
				>
					<svg
						class="w-4 h-4 text-text hover:text-red-400 transition-colors"
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
			<div class="flex items-center">
				<input
					type="file"
					ref="dropZoneRef"
					accept="image/*"
					class="hidden"
					id="blogImageInput"
					:disabled="loading"
					@change="handleFileUpload"
				/>
				<label
					for="blogImageInput"
					class="flex justify-center items-center w-full h-[30vh] p-4 bg-secondary bg-opacity-5 border-2 border-dashed border-secondary border-opacity-25 rounded-lg text-center cursor-pointer hover:border-opacity-50 transition-all"
					@dragover="handleDragOver"
					@drop="handleDrop"
				>
					<div
						v-if="!formData.imageURL"
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
						v-if="formData.imageURL"
						:src="formData.imageURL"
						alt="Preview"
						class="h-full w-full object-contain rounded"
					/>
				</label>
			</div>


			<label class="block text-sm font-medium text-text mb-2">
				Tags
			</label>
			<div class="flex flex-wrap gap-2 mb-2">
				<span
					v-for="tag in formData.tags"
					:key="tag"
					class="px-3 py-1 text-sm bg-secondary bg-opacity-10 rounded-lg text-text flex items-center"
				>
					{{ tag }}
					<button
						@click.prevent="removeTag(tag)"
						class="ml-2 text-text text-opacity-25 hover:text-red-500 transition-colors"
					>
						X
					</button>
				</span>
			</div>
			<div class="flex gap-2">
				<div
					class="relative w-full min-h-[20px] p-1 bg-secondary bg-opacity-10 rounded-lg flex flex-wrap gap-2 items-center"
				>
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

			<div v-if="error" class="text-red-400 text-sm">
				{{ error }}
			</div>

			<div class="flex justify-end space-x-4">
				<button
					type="button"
					@click="emit('close')"
					class="px-4 py-2 bg-secondary bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-all"
				>
					Cancel
				</button>
				<button
					type="submit"
					:disabled="loading || !hasChanges"
					class="px-4 py-2 bg-primary rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50"
				>
					{{ loading ? "Saving..." : "Save Changes" }}
				</button>
			</div>
		</form>
	</div>
</template>
