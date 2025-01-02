<script setup lang="ts">
const login = ref({ email: '', password: '' })
const loading = ref(false)
const error = ref('')
const { signIn } = useAuth()


async function handleLogin() {
    try {
        loading.value = true
        error.value = ''
        
        login.value.email = login.value.email.trim().toLowerCase()

        const result = await signIn('credentials', {
            email: login.value.email,
            password: login.value.password,
            redirect: false,
            callbackUrl: '/profile'
        })
        
        if (result?.error) {
            error.value = 'Invalid credentials'
            console.error('Login failed:', result.error)
        } else {
            navigateTo('/profile')
        }
    } catch (e: any) {
        error.value = e?.message || 'Login failed'
        console.error('Login error:', e)
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <form @submit.prevent="handleLogin">
        <h2>Login</h2>
        <p>
            Don't have an account? 
            <NuxtLink to="/signup">Sign Up</NuxtLink>
        </p>
        <p v-if="error">{{ error }}</p>
        <input 
            v-model="login.email" 
            type="email" 
            placeholder="Email" 
            required 
            :disabled="loading"
        />
        <input 
            v-model="login.password" 
            type="password" 
            placeholder="Password" 
            required 
            :disabled="loading"
        />
        <button type="submit" :disabled="loading">
            {{ loading ? 'Processing...' : 'Login' }}
        </button>
    </form>
</template>