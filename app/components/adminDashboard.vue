<script setup lang="ts">
// Types
import type { User } from "@prisma/client";
type UserWithBlog = {
	name: string;
	id: string;
	admin: boolean;
	frozen: boolean;
	email: string;
	password: string | null;
	image: string | null;
	website: string | null;
	createdAt: Date;
	updatedAt: Date;
	blog: {
		id: string;
		createdAt: Date;
		updatedAt: Date;
		ownerId: string;
		title: string;
		description: string | null;
		imageURL: string | null;
		tags: string[];
	} | null;
};
// All initial logic declarations
const loading = ref(false);
const error = ref("");
const users = ref<UserWithBlog[]>([]);
let currentUser = ref<User | null>(null);

// Runs this as soon as the page is mounted - checks if current user is admin
onMounted(async () => {
	const userData = await $fetch("/api/user/getAllData");

	if (userData) {
		currentUser.value = {
			...userData,
			password: "XXXXXXXXX",
			createdAt: new Date(userData.createdAt),
			updatedAt: new Date(userData.updatedAt),
		};
	}

	await fetchUsers();
});
// Helper functions & button handlers
async function fetchUsers() {
	try {
		loading.value = true;
		const allUsers = await $fetch("/api/admin/getAllUsers");
		users.value = allUsers.map((user) => ({
			...user,
			password: "XXXXXXXXX",
			createdAt: new Date(user.createdAt),
			updatedAt: new Date(user.updatedAt),
			blog: user.blog
				? {
						...user.blog,
						createdAt: new Date(user.blog.createdAt),
						updatedAt: new Date(user.blog.updatedAt),
				  }
				: null,
		}));
	} catch (e: any) {
		error.value = e?.response?._data?.message || "Failed to fetch users";
	} finally {
		loading.value = false;
	}
}

async function toggleAdminStatus(user: User) {
	try {
		if (user.email === currentUser.value?.email) {
			error.value = "You cannot modify your own admin status";
			return;
		}

		await $fetch("/api/admin/updateAdminStatus", {
			method: "POST",
			body: {
				userToUpdate: {
					email: user.email,
				},
			},
		});
		await fetchUsers();
	} catch (e: any) {
		error.value =
			e?.response?._data?.message || "Failed to update admin status";
	}
}

async function toggleFrozenStatus(user: User) {
	try {
		await $fetch("/api/admin/updateFrozenStatus", {
			method: "POST",
			body: {
				userToUpdate: {
					email: user.email,
				},
			},
		});
		await fetchUsers();
	} catch (e: any) {
		error.value =
			e?.response?._data?.message || "Failed to update frozen status";
	}
}
</script>

<template>
	<div class="bg-bg w-full">
		<div v-if="error" class="mb-6 p-4 rounded-lg bg-red-500 bg-opacity-20">
			<p class="text-sm text-red-400">{{ error }}</p>
		</div>

		<div v-if="loading" class="flex justify-center items-center py-12">
			<div
				class="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-primary"
			></div>
		</div>

		<div
			v-else
			class="bg-secondary bg-opacity-5 rounded-lg overflow-x-auto"
		>
			<table class="min-w-full">
				<thead class="bg-secondary bg-opacity-10">
					<tr>
						<th
							class="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-text whitespace-nowrap"
						>
							Name
						</th>
						<th
							class="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-text whitespace-nowrap"
						>
							Email
						</th>
						<th
							class="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-text whitespace-nowrap"
						>
							Blog
						</th>
						<th
							class="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-text whitespace-nowrap"
						>
							Created
						</th>
						<th
							class="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-text whitespace-nowrap"
						>
							Status
						</th>
						<th
							class="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-text whitespace-nowrap"
						>
							Actions
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-secondary divide-opacity-10">
					<tr
						v-for="user in users"
						:key="user.id"
						class="hover:bg-secondary hover:bg-opacity-[0.02] transition-colors"
					>
						<td
							class="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-text whitespace-nowrap"
						>
							{{ user.name }}
						</td>
						<td
							class="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-text whitespace-nowrap"
						>
							{{ user.email }}
						</td>
						<td
							class="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap"
						>
							<NuxtLink
								v-if="user.blog"
								:to="`/${user.blog.title}`"
								class="text-primary hover:text-opacity-80 transition-colors"
							>
								{{ user.blog.title }}
							</NuxtLink>
							<span v-else class="text-secondary opacity-50"
								>No blog</span
							>
						</td>
						<td class="px-6 py-4 text-sm text-text">
							{{ user.createdAt.toLocaleDateString() }}
						</td>
						<td class="px-6 py-4 text-sm">
							<div class="flex gap-2">
								<span
									v-if="user.admin"
									class="px-2 py-1 text-xs rounded-full bg-primary bg-opacity-20 text-primary"
								>
									Admin
								</span>
								<span
									v-if="user.frozen"
									class="px-2 py-1 text-xs rounded-full bg-red-500 bg-opacity-20 text-red-400"
								>
									Frozen
								</span>
							</div>
						</td>
						<td class="px-6 py-4 text-sm">
							<div class="flex gap-2">
								<button
									@click="toggleAdminStatus(user)"
									:disabled="
										user.email === currentUser?.email
									"
									class="px-3 py-1 rounded-lg bg-primary text-text hover:bg-opacity-90 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
								>
									{{
										user.admin
											? "Remove Admin"
											: "Make Admin"
									}}
								</button>
								<button
									@click="toggleFrozenStatus(user)"
									class="px-3 py-1 rounded-lg bg-red-500 text-text hover:bg-opacity-90 transition-colors"
								>
									{{ user.frozen ? "Unfreeze" : "Freeze" }}
								</button>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
