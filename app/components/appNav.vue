<script setup lang="ts">
// Types
type fullUser = {
	email: string;
	name: string;
	id: string;
	admin: boolean;
	frozen: boolean;
	password: string | null;
	image: string | null;
	website: string | null;
	createdAt: Date;
	updatedAt: Date;
	blog: {
		title: string;
		description?: string;
		imageURL?: string;
		tags: string[];
		createdAt: Date;
	};
};
// All initial logic declarations
const { status, signOut } = useAuth();
const route = useRoute();
const platformTitle = ref(useRuntimeConfig().public.platformTitle);
const props = defineProps<{
	user?: fullUser;
}>();
const isActive = computed(() => (path: string) => route.path === path);
let allowSignups = ref(useRuntimeConfig().public.allowSignups)
let userBlogPath = ref(
	(() => {
		if (props.user?.blog.title) {
			return `/${props.user.blog.title}`;
		} else {
			return null;
		}
	})()
);
computed(() => (props.user?.blog?.title ? `/${props.user.blog.title}` : null));
// Runs this as soon as the page is mounted
onMounted(async () => {
	if (!props.user && status.value === "authenticated") {
		const user = await $fetch("/api/user/getAllData");
		if (user?.blog?.title) {
			userBlogPath.value = `/${user.blog.title}`;
		}
	}
});
</script>

<template>
	<nav class="w-full py-4 px-6 mb-16 fixed top-0 left-0 right-0 z-50 bg-bg">
		<div class="max-w-6xl mx-auto flex justify-between items-center">
			<NuxtLink
				to="/"
				class="text-xl font-bold text-text hover:text-opacity-60 transition-colors"
			>
				{{ platformTitle }}
			</NuxtLink>

			<div class="flex items-center gap-6">
				<div
					v-if="status === 'authenticated'"
					class="flex items-center gap-2 sm:gap-6"
				>
					<NuxtLink
						v-if="userBlogPath"
						:to="userBlogPath"
						:class="`text-${
							isActive(userBlogPath) ? 'primary' : 'text'
						} hover:text-primary transition-colors`"
					>
						My Blog
					</NuxtLink>
					<NuxtLink
						to="/profile"
						:class="`text-${
							isActive('/profile') ? 'primary' : 'text'
						} hover:text-primary transition-colors`"
					>
						Profile
					</NuxtLink>
					<button
						@click="signOut()"
						class="px-4 py-2 text-text bg-secondary bg-opacity-25 rounded-lg hover:bg-opacity-40 transition-all"
					>
						Sign Out
					</button>
				</div>
				<div v-else class="flex items-center gap-6">
					<NuxtLink
						to="/"
						:class="`text-${
							isActive('/') ? 'primary' : 'text'
						} hover:text-primary transition-colors`"
					>
						Home
					</NuxtLink>
					<NuxtLink
						v-if="allowSignups == 'true'"
						to="/signup"
						:class="`text-${
							isActive('/signup') ? 'primary' : 'text'
						} hover:text-primary transition-colors`"
					>
						Sign Up
					</NuxtLink>
					<NuxtLink
						to="/login"
						class="px-4 py-2 text-text bg-primary rounded-lg hover:bg-opacity-90 transition-all"
					>
						Log In
					</NuxtLink>
				</div>
			</div>
		</div>
	</nav>
</template>
