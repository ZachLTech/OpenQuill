<script setup lang="ts">
// Types
type RecentPost = {
	id: string;
	ownerId: string;
	title: string;
	summary: string | null;
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
	published: boolean;
	heroImg: string | null;
	owner: {
		name: string;
		image: string | null;
		website: string | null;
	};
};
type MiniPost = {
	id: string;
};
type Blog = {
	id: string;
	ownerId: string;
	title: string;
	description: string | null;
	imageURL: string | null;
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
	owner: {
		image: string;
		name: string;
		website: string;
	};
	posts: MiniPost[];
};
// All initial logic declarations
const autoRedirectSingleBlog = useRuntimeConfig().public.firstBlogAutoRedirect;
const platformTitle = useRuntimeConfig().public.platformTitle;
const loading = ref(true);
const postsLoading = ref(false);
const instanceInitialized = ref(false);
const error = ref("");
const currentPage = ref(1);
const pageSize = ref(6);
const recentPosts = ref<RecentPost[] | null>([]);
let blogs = ref<Blog[]>();
let totalPages: number;

// Runs this as soon as the page is mounted - gets all blogs and navigates to single blog if there's only one and .env option is enabled to do so and recent posts
onMounted(async () => {
	try {
		loading.value = true;
		const allBlogs = await $fetch<Blog[]>("/api/blog/getAllBlogs");
		const admins = await $fetch("/api/user/getAdminData");
		blogs.value = allBlogs;
		if (admins) {
			instanceInitialized.value = true;
		}

		if (
			blogs.value[0] &&
			!blogs.value[1] &&
			(autoRedirectSingleBlog === "true" ||
				autoRedirectSingleBlog === "True")
		) {
			navigateTo(`/${blogs.value[0].title}`);
			return;
		}

		await fetchRecentPosts();

		useSeoMeta({
			title: `${platformTitle} - Home` || 'OpenQuill - Home',
			ogTitle: `${platformTitle} - Home` || 'OpenQuill - Home',
			description: `An open source blogging platform`,
			ogDescription: `An open source blogging platform`,
		})
	} catch (e: any) {
		error.value = "There was an error getting the blogs.";
		console.error("Blog loading error:", e);
	} finally {
		loading.value = false;
	}
});
// Watches for recent post pagination changes
watch(currentPage, () => {
	fetchRecentPosts();
});
// Helper functions and such
async function fetchRecentPosts() {
	try {
		postsLoading.value = true;
		totalPages = Math.ceil(
			(await $fetch("/api/blog/posts/publishedLength", {
				method: "POST",
				body: {
					blogId: "*",
				},
			})) / 6
		);
		const recentPostsResponse = await $fetch("/api/blog/posts/getRecent", {
			method: "POST",
			body: {
				page: currentPage.value,
				pageSize: pageSize.value,
			},
		});
		if (recentPostsResponse) {
			recentPosts.value = recentPostsResponse.map((post) => ({
				...post,
				createdAt: new Date(post.createdAt),
				updatedAt: new Date(post.updatedAt),
			}));
		}
	} catch (error) {
		console.error("Error fetching recent posts:", error);
	} finally {
		postsLoading.value = false;
	}
}
</script>

<template>
	<appNav v-if="blogs?.length > 0 && blogs != null && instanceInitialized" />
	<div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
		<div class="max-w-3xl sm:max-w-7xl mx-auto">
			<div
				v-if="loading"
				class="flex justify-center items-center absolute min-h-[400px]"
			>
				<div
					class="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-primary"
				></div>
			</div>

			<div v-else class="flex flex-col items-center">
				<div
					v-if="error"
					class="p-4 w-full flex justify-center absolute"
				>
					<div
						class="w-full p-4 rounded-lg bg-red-500 bg-opacity-20 flex"
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
							<h3 class="text-sm font-medium text-red-400">
								{{ error }}
							</h3>
						</div>
					</div>
				</div>

				<div
					v-if="
						blogs?.length <= 0 ||
						(blogs == null && !instanceInitialized)
					"
					class="text-center py-12 px-4 sm:px-6 lg:py-16 lg:px-8"
				>
					<h2
						class="text-3xl font-extrabold tracking-tight text-text sm:text-4xl"
					>
						Welcome to
						<span
							class="bg-gradient-to-r from-blue-600 to-indigo-400 inline-block text-transparent bg-clip-text"
							>OpenQuill</span
						>
					</h2>
					<p class="mt-4 text-lg text-gray-500">
						This appears to be a new instance. The first user to
						sign up will be the administrator.
					</p>
					<div class="mt-8 w-full flex justify-center">
						<splashSignup class="w-[60%]" />
					</div>
				</div>


				<div
					v-else-if="
						blogs?.length <= 0 ||
						(blogs == null && instanceInitialized)
					"
					class="text-center py-12"
				>
					<svg
						class="mx-auto h-12 w-12 text-gray-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						/>
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900">
						No blogs
					</h3>
					<p class="mt-1 text-sm text-gray-500">
						There aren't any blogs available right now.
					</p>
				</div>

				<div v-else class="space-y-12 w-full px-1 sm:px-0 sm:max-w-6xl">
					<div
						v-if="postsLoading"
						class="flex justify-center items-center min-h-[400px]"
					>
						<div
							class="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-primary"
						></div>
					</div>
					<div v-else-if="recentPosts && recentPosts.length > 0">
						<h2 class="text-2xl font-bold text-text mb-6">
							Recent Posts
						</h2>
						<div
							class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
						>
							<NuxtLink
								v-for="post in recentPosts"
								:key="post.id"
								:to="`/blog/${post.id}`"
								class="bg-secondary bg-opacity-5 min-h-[140px] w-full rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-4 flex flex-col justify-between"
								:style="
									post.heroImg
										? {
												backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.60), rgba(0, 0, 0, 0.60)), url(${post.heroImg})`,
												backgroundSize: 'cover',
												backgroundPosition: 'center',
										  }
										: {}
								"
							>
								<h3
									class="text-lg font-semibold text-text mb-2"
								>
									{{ post.title }}
								</h3>
								<p
									class="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2"
								>
									{{ post.summary || "No Summary Provided" }}
								</p>
								<div
									class="flex items-center text-sm text-gray-500 dark:text-gray-400"
								>
									<svg
										class="w-4 h-4 mr-1"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<span>{{
										new Date(
											post.createdAt
										).toLocaleDateString()
									}}</span>
									<div
										v-if="!post.owner.website"
										class="flex items-center"
										@click.stop
									>
										<svg
											class="w-4 h-4 mr-1 ml-2"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
											/>
										</svg>
										<span>{{ post.owner.name }}</span>
									</div>
									<NuxtLink
										v-if="post.owner.website"
										:to="post.owner.website"
										target="_blank"
										class="flex items-center"
										@click.stop
									>
										<svg
											class="w-4 h-4 mr-1 ml-2"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
											/>
										</svg>
										<span>{{ post.owner.name }}</span>
									</NuxtLink>
								</div>
							</NuxtLink>
						</div>

						<div
							v-if="totalPages > 1"
							class="flex justify-center mt-8 gap-2"
						>
							<button
								@click="currentPage--"
								:disabled="currentPage === 1"
								class="px-4 py-2 rounded bg-secondary bg-opacity-10 text-text hover:bg-opacity-[0.08] transition-all disabled:opacity-50"
							>
								Back
							</button>
							<span class="text-text text-opacity-25 px-4 py-2"
								>Page {{ currentPage }} / {{ totalPages }}</span
							>
							<button
								@click="currentPage++"
								:disabled="recentPosts.length < pageSize"
								class="px-4 py-2 rounded bg-secondary bg-opacity-10 text-text hover:bg-opacity-[0.08] transition-all disabled:opacity-50"
							>
								Next
							</button>
						</div>
					</div>

					<h2 class="text-2xl font-bold text-text mb-6">
						Available Blogs
					</h2>
					<div class="space-y-6">
						<NuxtLink
							v-for="blog in blogs"
							:key="blog.id"
							:to="`/${blog.title}`"
							class="block max-w-6xl h-auto min-h-[250px] mx-auto bg-secondary bg-opacity-5 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
						>
							<div
								class="w-full sm:max-h-[250px] flex flex-col sm:flex-row p-6"
							>
								<div
									v-if="blog.imageURL"
									class="flex-shrink-0 h-[200px] aspect-square object-cover mb-4 sm:mb-0"
								>
									<img
										:src="blog.imageURL"
										:alt="blog.title"
										class="w-full h-full object-cover rounded-lg"
									/>
								</div>
								<div
									v-else-if="!blog.imageURL"
									class="flex-shrink-0 h-[200px] aspect-square object-cover mb-4 sm:mb-0"
								>
									<div
										class="w-full h-full rounded-lg border-2 border-dashed border-secondary border-opacity-15 flex items-center justify-center"
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
								</div>
								<div
									class="flex-grow flex flex-col items-center sm:items-baseline justify-between sm:ml-6"
								>
									<h3
										class="text-xl font-semibold text-text mb-2"
									>
										{{ blog.title }}
									</h3>
									<p
										class="text-gray-600 h-[60%] dark:text-gray-300 mb-4 line-clamp-3"
									>
										{{
											blog.description ||
											"No Description Provided."
										}}
									</p>
									<div
										class="flex items-center space-x-2 sm:space-x-4 text-sm text-gray-500 dark:text-gray-400"
									>
										<div
											v-if="!blog.owner.website"
											class="flex items-center"
											@click.stop
										>
											<svg
												class="w-4 h-4 mr-1 ml-2"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
												/>
											</svg>
											<span>{{ blog.owner.name }}</span>
										</div>
										<NuxtLink
											v-if="blog.owner.website"
											:to="blog.owner.website"
											target="_blank"
											class="flex items-center"
											@click.stop
										>
											<svg
												class="w-4 h-4 mr-1 ml-2"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
												/>
											</svg>
											<span>{{ blog.owner.name }}</span>
										</NuxtLink>
										<span class="flex items-center">
											<svg
												class="w-4 h-4 mr-1"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
											Created
											{{
												new Date(
													blog.createdAt
												).toLocaleDateString()
											}}
										</span>
										<span class="flex items-center">
											<svg
												class="w-4 h-4 mr-1"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
												/>
											</svg>
											{{ blog.posts.length || 0 }}
											{{
												blog.posts.length == 1
													? "post"
													: "posts"
											}}
										</span>
									</div>
								</div>
							</div>
							<div
								v-if="blog.tags.length > 0"
								class="w-full flex flex-wrap gap-2 justify-center sm:justify-normal items-center px-6 pb-6"
							>
								<span
									v-for="tag in blog.tags"
									class="px-2 py-1 rounded text-text text-opacity-50 bg-secondary bg-opacity-5"
								>
									{{ tag }}
								</span>
							</div>
						</NuxtLink>
					</div>
				</div>
				<footer
					class="w-full mt-8 pt-4 border-t border-text border-opacity-25 flex justify-center"
				>
					<div class="mt-2">
						<p
							class="text-text text-sm sm:text-[16px] text-opacity-20"
						>
							Powered by
							<a
								href="https://github.com/ZachLTech/OpenQuill"
								class="underline"
								target="_blank"
								>OpenQuill</a
							>
							- Open Source Blogging Platform
						</p>
					</div>
				</footer>
			</div>
		</div>
	</div>
</template>
