<script setup lang="ts">
    // All initial logic declarations
    const config = useRuntimeConfig()
    const login = ref({ email: '', password: '' })
    const loading = ref(false)
    const error = ref('')
    const { signIn } = useAuth()
    // Form handling
    async function handleLogin() {
        try {
            loading.value = true
            error.value = ''
            
            login.value.email = login.value.email.trim().toLowerCase()

            const result = await signIn('credentials', {
                email: login.value.email,
                password: login.value.password,
                redirect: false
            })
            
            if (result?.error) {
                // error.value = `Error: ${result.error}`
                error.value = `Invalid credentials`
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
    <form @submit.prevent="handleLogin" class="w-full max-w-md mx-auto bg-gray-700 bg-opacity-15 p-8 rounded-lg shadow-lg">
        <h2 class="text-3xl font-extrabold text-text text-center mb-6">Welcome Back</h2>
        
        <p class="text-center text-secondary opacity-70 mb-8">
            Don't have an account? 
            <NuxtLink to="/signup" class="text-primary hover:text-opacity-80 transition-colors">
                Sign Up
            </NuxtLink>
        </p>

        <div v-if="error" class="mb-6 p-4 rounded-lg bg-red-500 bg-opacity-20">
            <p class="text-sm text-red-400">{{ error }}</p>
        </div>

        <div class="space-y-5">
            <div>
                <input 
                    v-model="login.email" 
                    type="email" 
                    placeholder="Email" 
                    required 
                    :disabled="loading"
                    class="w-full p-4 bg-gray-700 bg-opacity-15 border-0 rounded-lg placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20text-textdisabled:bg-opacity-10 disabled:cursor-not-allowedtransition-all"
                />
            </div>

            <div>
                <input 
                    v-model="login.password" 
                    type="password" 
                    placeholder="Password" 
                    required 
                    :disabled="loading"
                    class="w-full p-4 bg-gray-700 bg-opacity-15 border-0 rounded-lg placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20text-textdisabled:bg-opacity-10 disabled:cursor-not-allowedtransition-all"
                />
            </div>

            <button 
                type="submit" 
                :disabled="loading"
                class="w-full py-4 bg-primary text-lg font-medium rounded-lg hover:bg-opacity-90 transition-alldisabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
                {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
        </div>
    </form>
</template>