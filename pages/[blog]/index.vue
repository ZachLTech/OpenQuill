<script setup lang="ts">
// Types
import type { Post } from "@prisma/client";
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
type User =
	| {
			id: string;
			email: string;
			name: string;
	  }
	| null
	| undefined;
// All initial logic declarations
const route = useRoute();
const { data, status } = useAuth();
const currentSessionUser = ref<User | undefined>(data.value?.user as User);
const postsPerPage = 6;
const platformTitle = useRuntimeConfig().public.platformTitle;
let showDeleteModal = ref(false);
let postToDelete = ref<any | null>(null);
let loading = ref(true);
let unpublishedPostsLoading = ref(false);
let publishedPostsLoading = ref(false);
let error = ref("");
let blog = ref<Blog | null>(null);
let unpublishedPosts = ref<any | null>([]);
let publishedPosts = ref<any | null>([]);
let totalUnpublishedPages = ref(0);
let totalPublishedPages = ref(0);
let currentUnpublishedPage = ref(1);
let currentPublishedPage = ref(1);
let isEditing = ref(false);
let blogInitialized = ref(true);
// Runs this as soon as the page is mounted - gets blog data
onMounted(async () => {
	try {
		loading.value = true;
		const blogData = await $fetch("/api/blog/getData", {
			method: "POST",
			body: {
				blogTitle: route.params.blog,
			},
		});
		if (blogData) {
			blog.value = {
				...blogData,
				createdAt: new Date(blogData.createdAt),
				updatedAt: new Date(blogData.updatedAt),
			};
			if (
				!blogData.description &&
				!blogData.imageURL &&
				blogData.tags.length < 1
			) {
				blogInitialized.value = false;
			}
		}

		if (!blog.value) {
			error.value = "Blog not found";
			return;
		}

		totalPublishedPages.value = Math.ceil(
			(await $fetch("/api/blog/posts/publishedLength", {
				method: "POST",
				body: {
					blogId: blog.value.id,
				},
			})) / 6
		);

		const publishedPostsData = await $fetch("/api/blog/posts/getPreviews", {
			method: "POST",
			body: {
				page: currentPublishedPage.value,
				pageSize: postsPerPage,
				blogId: blog.value.id,
			},
		});

		publishedPosts.value = publishedPostsData;

		if (
			status.value == "authenticated" &&
			currentSessionUser.value &&
			currentSessionUser.value.id == blog.value.ownerId
		) {
			totalUnpublishedPages.value = Math.ceil(
				(await $fetch("/api/blog/posts/unpublishedLength", {
					method: "POST",
					body: {
						blog: blog.value.title,
						blogId: blog.value.id,
					},
				})) / 6
			);

			const unpublishedPostsData = await $fetch(
				"/api/blog/posts/getUnpublishedPreviews",
				{
					method: "POST",
					body: {
						page: currentUnpublishedPage.value,
						pageSize: postsPerPage,
						blogId: blog.value.id,
						blog: blog.value.title,
					},
				}
			);

			unpublishedPosts.value = unpublishedPostsData;

			useSeoMeta({
				title: `${route.params.blog}` || 'Blog',
				ogTitle: `${route.params.blog}` || 'Blog',
				description: `View the ${route.params.blog} Blog and Posts`,
				ogDescription: `View the ${route.params.blog} Blog and Posts`,
				ogImage: `${blog.value?.imageURL}`,
				twitterCard: 'summary_large_image',
			})
		}
	} catch (e: any) {
		error.value = "Error loading blog";
		console.error("Blog loading error:", e);
	} finally {
		loading.value = false;
	}
});
// Watches pagination buttons and updates posts
watch(currentUnpublishedPage, () => {
	fetchUnpublishedPosts();
});
watch(currentPublishedPage, () => {
	fetchPublishedPosts();
});
// The next few functions are literally either helpers or form submission stuff
async function handleBlogUpdate() {
	try {
		loading.value = true;

		const currentUser = await $fetch("/api/user/getAllData");

		if (currentUser && currentUser.frozen) {
			error.value =
				"You can't do this. Your account is currently frozen.";
			return;
		}

		const blogData = await $fetch("/api/blog/getData", {
			method: "POST",
			body: {
				blogTitle: route.params.blog,
			},
		});
		if (blogData) {
			blog.value = {
				...blogData,
				createdAt: new Date(blogData.createdAt),
				updatedAt: new Date(blogData.updatedAt),
			};
		} else if (!blogData) {
			const allBlogs = await $fetch("/api/blog/getAllBlogs");
			for (let i = 0; i < allBlogs.length; i++) {
				if (allBlogs[i].ownerId == blog.value?.ownerId) {
					navigateTo(`/${allBlogs[i].title}`);
				}
			}
		}
	} catch (e: any) {
		error.value = "Error loading blog";
		console.error("Blog loading error:", e);
	} finally {
		loading.value = false;
	}
}
// Changes DB
async function createNewPost() {
	const currentUser = await $fetch("/api/user/getAllData");

	if (currentUser && currentUser.frozen) {
		error.value = "You can't do this. Your account is currently frozen.";
		return;
	}

	const newPost = await $fetch("/api/blog/posts/create", {
		method: "POST",
		body: {
			title: "",
		},
	});
	navigateTo(`/${blog.value?.title}/${newPost.id}-edit`);
}

async function deletePost(post: Post) {
	postToDelete.value = post;
	showDeleteModal.value = true;
}
// Changes DB
async function confirmDelete() {
	try {
		await $fetch("/api/blog/posts/delete", {
			method: "POST",
			body: {
				post: postToDelete.value,
			},
		});
	} catch (e: any) {
		error.value = `Something went wrong... Failed to delete post with error: ${e}`;
		console.error(e);
	} finally {
		const unpublishedIndex = unpublishedPosts.value.findIndex(
			(p: any) => p.id === postToDelete.value.id
		);
		if (unpublishedIndex > -1) {
			unpublishedPosts.value.splice(unpublishedIndex, 1);
			fetchUnpublishedPosts();
			postToDelete.value = null;
			showDeleteModal.value = false;
		}
		const publishedIndex = publishedPosts.value.findIndex(
			(p: any) => p.id === postToDelete.value.id
		);
		if (publishedIndex > -1) {
			publishedPosts.value.splice(publishedIndex, 1);
			fetchPublishedPosts();
			postToDelete.value = null;
			showDeleteModal.value = false;
		}
	}
}

async function fetchUnpublishedPosts() {
	try {
		if (!blog.value) {
			error.value = "Blog not found";
			return;
		}

		if (
			status.value == "authenticated" &&
			currentSessionUser.value &&
			currentSessionUser.value.id == blog.value.ownerId
		) {
			totalUnpublishedPages.value = Math.ceil(
				(await $fetch("/api/blog/posts/unpublishedLength", {
					method: "POST",
					body: {
						blog: blog.value.title,
					},
				})) / 6
			);

			const unpublishedPostsData = await $fetch(
				"/api/blog/posts/getUnpublishedPreviews",
				{
					method: "POST",
					body: {
						page: currentUnpublishedPage.value,
						pageSize: postsPerPage,
						blogId: blog.value.id,
						blog: blog.value.title,
					},
				}
			);

			unpublishedPosts.value = unpublishedPostsData;
		}
	} catch (error) {
		console.error("Error fetching recent posts:", error);
	} finally {
		unpublishedPostsLoading.value = false;
	}
}

async function fetchPublishedPosts() {
	try {
		if (!blog.value) {
			error.value = "Blog not found";
			return;
		}

		totalPublishedPages.value = Math.ceil(
			(await $fetch("/api/blog/posts/publishedLength", {
				method: "POST",
				body: {
					blogId: blog.value.id,
				},
			})) / 6
		);

		const publishedPostsData = await $fetch("/api/blog/posts/getPreviews", {
			method: "POST",
			body: {
				page: currentPublishedPage.value,
				pageSize: postsPerPage,
				blogId: blog.value.id,
			},
		});

		publishedPosts.value = publishedPostsData;
	} catch (error) {
		console.error("Error fetching recent posts:", error);
	} finally {
		publishedPostsLoading.value = false;
	}
}
</script>

<template>
	<appNav />

	<div v-if="loading" class="flex justify-center items-center min-h-[400px]">
		<div
			class="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-primary"
		></div>
	</div>

	<div v-if="error" class="p-4 w-full flex justify-center z-10 absolute top-15">
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

	<div
		v-if="blog"
		class="min-h-screen py-8 mt-16 sm:pt-10 px-4 sm:px-6 lg:px-8"
	>
		<confirmModal
			:is-open="showDeleteModal"
			title="Delete Post"
			message="Are you sure you want to delete this post? This action cannot be undone."
			@confirm="confirmDelete"
			@cancel="showDeleteModal = false"
		/>
		<div class="max-w-6xl mx-auto">
			<div
				class="relative w-full h-[300px] rounded-xl overflow-hidden mb-8"
			>
				<img
					v-if="blog.imageURL"
					:src="blog.imageURL"
					:alt="blog.title"
					class="w-full h-full object-cover"
				/>
				<div
					class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/70 to-transparent"
				></div>
				<div class="absolute bottom-0 left-0 p-8">
					<h1 class="text-4xl font-bold text-white mb-2">
						{{ blog.title }}
					</h1>
					<p
						v-if="blog.description"
						class="max-h-[190px] text-lg text-gray-200 line-clamp-6"
					>
						{{ blog.description }}
					</p>
				</div>
			</div>

			<div
				class="flex items-center space-x-4 mb-8 p-4 bg-secondary bg-opacity-5 rounded-lg"
			>
				<img
					v-if="blog.owner.image"
					:src="blog.owner.image"
					:alt="blog.owner.name"
					class="w-12 h-12 rounded-full"
				/>
				<div>
					<h2 class="text-lg font-semibold text-text">
						{{ blog.owner.name }} - Author
					</h2>
					<a
						v-if="blog.owner.website"
						:href="blog.owner.website"
						target="_blank"
						class="text-primary hover:text-opacity-80"
					>
						Website
					</a>
				</div>
			</div>

			<div
				v-if="
					status === 'authenticated' &&
					currentSessionUser?.id === blog.ownerId
				"
				class="mb-8 flex items-center gap-4"
			>
				<NuxtLink
					v-if="!blogInitialized"
					:to="`/${blog.title}/start-here`"
					class="px-4 py-2 bg-primary rounded-lg hover:bg-opacity-90 transition-all"
				>
					Customize your blog
				</NuxtLink>
				<button
					v-if="!isEditing && blogInitialized"
					@click="isEditing = true"
					class="px-4 py-2 bg-secondary bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-all"
				>
					Edit Blog
				</button>
				<button
					@click="createNewPost"
					class="px-4 py-2 bg-primary rounded-lg hover:bg-opacity-90 transition-all"
				>
					New Post
				</button>
			</div>

			<editBlogForm
				v-if="isEditing"
				:blog="blog"
				@close="isEditing = false"
				@update="handleBlogUpdate"
				class="mb-8 w-full h-auto"
			/>

			<div v-if="blog.tags?.length > 0" class="flex flex-wrap gap-2 mb-8">
				<span
					v-for="tag in blog.tags"
					:key="tag"
					class="px-3 py-1 text-sm bg-secondary bg-opacity-5 rounded-lg text-text"
				>
					{{ tag }}
				</span>
			</div>

			<div
				v-if="
					unpublishedPosts?.length > 0 &&
					status == 'authenticated' &&
					currentSessionUser?.id === blog.ownerId
				"
				class="space-y-8"
			>
				<h2 class="text-2xl font-bold text-text mb-6">Drafts</h2>
				<div
					v-if="unpublishedPostsLoading"
					class="flex justify-center items-center min-h-[400px]"
				>
					<div
						class="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-primary"
					></div>
				</div>
				<div
					v-else-if="!unpublishedPostsLoading"
					class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
				>
					<NuxtLink
						v-for="post in unpublishedPosts"
						:key="post.id"
						:to="`/${blog.title}/${post.id}`"
						class="bg-secondary bg-opacity-5 rounded-lg shadow-md hover:shadow-lg transition-all p-4"
						:class="{ 'pb-7': !post.summary }"
					>
						<div class="relative">
							<img
								v-if="post.heroImg"
								:src="post.heroImg"
								:alt="post.title"
								class="w-full h-48 object-cover rounded-lg mb-4"
							/>
							<div
								v-if="!post.heroImg"
								class="w-full h-48 rounded-lg mb-4 border-2 border-dashed border-secondary border-opacity-15 flex justify-center items-center"
							>
								<svg
									class="w-16 h-16 text-secondary text-opacity-15"
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
							</div>
							<span
								v-if="!post.published"
								class="absolute top-2 right-2 px-2 py-1 text-xs bg-secondary bg-opacity-20 text-gray-200 rounded"
							>
								Draft
							</span>
						</div>
						<div class="h-[35%] flex flex-col justify-between">
							<h3 class="text-lg font-semibold text-text mb-2">
								{{ post.title }}
							</h3>
							<p
								class="text-gray-400 text-sm line-clamp-2 mb-4 h-[40%]"
							>
								{{ post.summary || "No Summary Available." }}
							</p>
							<div
								class="flex items-center justify-between text-sm text-gray-500"
							>
								<span>{{
									new Date(
										post.createdAt
									).toLocaleDateString()
								}}</span>
								<div
									class="flex items-center gap-2"
									v-if="
										currentSessionUser?.id === blog.ownerId
									"
								>
									<NuxtLink
										:to="`/${blog.title}/${post.id}-edit`"
										class="text-primary hover:text-opacity-80"
										@click.stop
									>
										Edit
									</NuxtLink>
									<button
										@click.prevent.stop="deletePost(post)"
										class="text-red-400 hover:text-opacity-80"
									>
										Delete
									</button>
								</div>
							</div>
						</div>
					</NuxtLink>
				</div>

				<div
					v-if="totalUnpublishedPages > 1"
					class="flex justify-center mt-8 gap-2"
				>
					<button
						@click="currentUnpublishedPage--"
						:disabled="currentUnpublishedPage == 1"
						class="px-4 py-2 rounded bg-secondary bg-opacity-10 text-text hover:bg-opacity-[0.08] transition-all disabled:opacity-50"
					>
						Back
					</button>
					<span class="text-text text-opacity-25 px-4 py-2"
						>Page {{ currentUnpublishedPage }} /
						{{ totalUnpublishedPages }}</span
					>
					<button
						@click="currentUnpublishedPage++"
						:disabled="
							currentUnpublishedPage == totalUnpublishedPages
						"
						class="px-4 py-2 rounded bg-secondary bg-opacity-10 text-text hover:bg-opacity-[0.08] transition-all disabled:opacity-50"
					>
						Next
					</button>
				</div>
			</div>

			<div v-if="publishedPosts?.length > 0" class="space-y-8 mt-8">
				<h2 class="text-2xl font-bold text-text mb-6">Posts</h2>
				<div
					v-if="publishedPostsLoading"
					class="flex justify-center items-center min-h-[400px]"
				>
					<div
						class="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-primary"
					></div>
				</div>
				<div
					v-if="!publishedPostsLoading"
					class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
				>
					<NuxtLink
						v-for="post in publishedPosts"
						:key="post.id"
						:to="`/${blog.title}/${post.id}`"
						class="bg-secondary bg-opacity-5 rounded-lg shadow-md hover:shadow-lg transition-all p-4"
						:class="{ 'pb-7': !post.summary }"
					>
						<div class="relative">
							<img
								v-if="post.heroImg"
								:src="post.heroImg"
								:alt="post.title"
								class="w-full h-48 object-cover rounded-lg mb-4"
							/>
							<div
								v-if="!post.heroImg"
								class="w-full h-48 rounded-lg mb-4 border-2 border-dashed border-secondary border-opacity-15 flex justify-center items-center"
							>
								<svg
									class="w-16 h-16 text-secondary text-opacity-15"
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
							</div>
							<span
								v-if="!post.published"
								class="absolute top-2 right-2 px-2 py-1 text-xs bg-secondary bg-opacity-20 text-gray-200 rounded"
							>
								Draft
							</span>
						</div>
						<div class="h-[35%] flex flex-col justify-between">
							<h3 class="text-lg font-semibold text-text mb-2">
								{{ post.title }}
							</h3>
							<p
								class="text-gray-400 text-sm line-clamp-2 mb-4 h-full"
							>
								{{ post.summary || "No Summary Available." }}
							</p>
							<div
								class="flex items-center justify-between text-sm text-gray-500"
							>
								<span>{{
									new Date(
										post.createdAt
									).toLocaleDateString()
								}}</span>
								<div
									class="flex items-center gap-2"
									v-if="
										currentSessionUser?.id === blog.ownerId
									"
								>
									<NuxtLink
										:to="`/${blog.title}/${post.id}-edit`"
										class="text-primary hover:text-opacity-80"
										@click.stop
									>
										Edit
									</NuxtLink>
									<button
										@click.prevent.stop="deletePost(post)"
										class="text-red-400 hover:text-opacity-80"
									>
										Delete
									</button>
								</div>
							</div>
						</div>
					</NuxtLink>
				</div>

				<div
					v-if="totalPublishedPages > 1"
					class="flex justify-center mt-8 gap-2"
				>
					<button
						@click="currentPublishedPage--"
						:disabled="currentPublishedPage == 1"
						class="px-4 py-2 rounded bg-secondary bg-opacity-10 text-text hover:bg-opacity-[0.08] transition-all disabled:opacity-50"
					>
						Back
					</button>
					<span class="text-text text-opacity-25 px-4 py-2"
						>Page {{ currentPublishedPage }} /
						{{ totalPublishedPages }}</span
					>
					<button
						@click="currentPublishedPage++"
						:disabled="currentPublishedPage == totalPublishedPages"
						class="px-4 py-2 rounded bg-secondary bg-opacity-10 text-text hover:bg-opacity-[0.08] transition-all disabled:opacity-50"
					>
						Next
					</button>
				</div>
			</div>

			<div v-else class="text-center py-12">
				<svg
					class="mx-auto h-12 w-12 text-gray-400"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
				>
					<circle cx="12" cy="12" r="10" stroke-width="2" />
					<path
						d="M8 9h.01"
						stroke-width="2"
						stroke-linecap="round"
					/>
					<path
						d="M16 9h.01"
						stroke-width="2"
						stroke-linecap="round"
					/>
					<path
						d="M16 16c0-2-1.791-4-4-4s-4 2-4 4"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-text">No posts yet</h3>
				<p
					v-if="
						status == 'authenticated' &&
						currentSessionUser?.id == blog.ownerId
					"
					class="mt-1 text-sm text-gray-500"
				>
					Get started by publishing your first post
				</p>
			</div>
		</div>
	</div>
</template>
