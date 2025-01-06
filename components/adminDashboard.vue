<script setup lang="ts">
import type { User } from '@prisma/client'

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
    } | null
}

const loading = ref(false)
const error = ref('')
const users = ref<UserWithBlog[]>([])
let currentUser = ref<User | null>(null)

// Check if current user is admin
onMounted(async () => {
    const userData = await $fetch('/api/user/getAllData')
    
    if (userData) {
        currentUser.value = {
        ...userData,
        password: 'XXXXXXXXX',
        createdAt: new Date(userData.createdAt),
        updatedAt: new Date(userData.updatedAt)
    }
    }

    await fetchUsers()
})

async function fetchUsers() {
    try {
        loading.value = true
        const allUsers = await $fetch('/api/admin/getAllUsers')
        users.value = allUsers.map(user => ({
            ...user,
            password: 'XXXXXXXXX',
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
            blog: user.blog ? {
                ...user.blog,
                createdAt: new Date(user.blog.createdAt),
                updatedAt: new Date(user.blog.updatedAt)
            } : null
        }))
    } catch (e: any) {
        error.value = e?.response?._data?.message || 'Failed to fetch users'
    } finally {
        loading.value = false
    }
}

async function toggleAdminStatus(user: User) {
    try {
        if (user.email === currentUser.value?.email) {
            error.value = "You cannot modify your own admin status"
            return
        }

        await $fetch('/api/admin/updateAdminStatus', {
            method: 'POST',
            body: {
                userToUpdate: {
                    email: user.email
                }
            }
        })
        await fetchUsers()
    } catch (e: any) {
        error.value = e?.response?._data?.message || 'Failed to update admin status'
    }
}

async function toggleFrozenStatus(user: User) {
    try {
        if (user.email === currentUser.value?.email) {
            error.value = "You cannot freeze your own account"
            return
        }

        await $fetch('/api/admin/updateFrozenStatus', {
            method: 'POST',
            body: {
                userToUpdate: {
                    email: user.email
                }
            }
        })
        await fetchUsers()
    } catch (e: any) {
        error.value = e?.response?._data?.message || 'Failed to update frozen status'
    }
}
</script>

<template>
    <div>
        <h1>Admin Dashboard</h1>
        
        <div v-if="error">{{ error }}</div>
        
        <div v-if="loading">Loading users...</div>
        
        <div v-else>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Blog</th>
                        <th>Created</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="user in users" :key="user.id">
                        <td>{{ user.name }}</td>
                        <td>{{ user.email }}</td>
                        <td>
                            <NuxtLink 
                                v-if="user.blog" 
                                :to="`/${user.blog.title}`"
                            >
                                {{ user.blog.title }}
                            </NuxtLink>
                            <span v-else>No blog</span>
                        </td>
                        <td>{{ user.createdAt.toLocaleDateString() }}</td>
                        <td>
                            <span v-if="user.admin">Admin</span>
                            <span v-if="user.frozen">Frozen</span>
                        </td>
                        <td>
                            <button 
                                @click="toggleAdminStatus(user)"
                                :disabled="user.email === currentUser?.email"
                            >
                                {{ user.admin ? 'Remove Admin' : 'Make Admin' }}
                            </button>
                            <button 
                                @click="toggleFrozenStatus(user)"
                                :disabled="user.email === currentUser?.email"
                            >
                                {{ user.frozen ? 'Unfreeze' : 'Freeze' }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

