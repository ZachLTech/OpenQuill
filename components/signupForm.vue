<script setup lang="ts">
    // All initial logic declarations
    const signup = ref({ email: '', username: '', password: '', blogname: '' })
    const login = ref({ email: '', password: '' })
    const error = ref('')
    const loading = ref(false)
    const { signIn } = useAuth()
    // Form handling and helper functions
    function validateInput(signupInput: any): string {
        const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
        const usernameRegex = /^[0-9A-Za-z\s-]{2,16}$/
        const passwordRegex = /^(?=.*?[A-Z])(?=.*?[0-9]).{8,}$/
        const blognameRegex = /^[a-zA-Z0-9\s-]{2,50}$/
        
        if (!emailRegex.test(signupInput?.email)) {
            return 'The Email you entered is not valid.'
        } else if (!usernameRegex.test(signupInput?.username)) {
            return 'Username should be between 2 and 16 characters. Alphanumeric only.'
        } else if (!passwordRegex.test(signupInput?.password)) {
            return 'Password should be at least 8 characters including a number and uppercase letter'
        } else if (!blognameRegex.test(signupInput?.blogname)) {
            return 'Blog Name should be between 2 and 50 characters. Alphanumeric and spaces only.'
        } else {
            return ''
        }
    }

    async function handleSignup() {
        try {
            loading.value = true

            signup.value.email = signup.value.email.trim().toLowerCase()
            signup.value.username = signup.value.username.trim()
            signup.value.password = signup.value.password.trim()
            signup.value.blogname = signup.value.blogname.trim()

            error.value = await validateInput(signup.value)

            if (error.value != '') {
                return
            }
            
            const response = await $fetch('/api/auth/signup', {
                method: 'POST',
                body: signup.value
            })

            if (response) {
                await handleLogin()
            }
        } catch (e: any) {
            error.value = e?.response?._data?.message || 'Signup failed'
            console.error('Signup error:', e)
        } finally {
            loading.value = false
        }
    }

    async function handleLogin() {
        try {
            loading.value = true
            error.value = ''
            
            const result = await signIn('credentials', {
                email: login.value.email || signup.value.email,
                password: login.value.password || signup.value.password,
                redirect: false
            })

            if (result?.error) {
                error.value = 'Invalid credentials'
                console.error('Login failed:', result.error)
            } else {
                const newBlog = await $fetch('/api/blog/create', {
                    method: 'POST',
                    body: {
                        blogTitle: signup.value.blogname
                    }
                })
                navigateTo(`/${newBlog.title}/start-here`)
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
    <form @submit.prevent="handleSignup" class="w-full max-w-md mx-auto bg-secondary bg-opacity-5 p-8 rounded-lg shadow-lg">
        <h2 class="text-3xl font-extrabold text-text text-center mb-6">Create Account</h2>
        
        <p class="text-center text-secondary opacity-70 mb-8">
            Have an account? 
            <NuxtLink to="/login" class="text-primary hover:text-opacity-80 transition-colors">
                Log In
            </NuxtLink>
        </p>

        <div v-if="error" class="mb-6 p-4 rounded-lg bg-red-500 bg-opacity-20">
            <p class="text-sm text-red-400">{{ error }}</p>
        </div>

        <div class="space-y-5">
            <div>
                <input 
                    v-model="signup.email" 
                    type="email" 
                    placeholder="Email" 
                    required 
                    :disabled="loading"
                    class="w-full p-4 bg-secondary bg-opacity-5 border-0 rounded-lg placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20text-textdisabled:bg-opacity-10 disabled:cursor-not-allowedtransition-all"
                />
            </div>

            <div>
                <input 
                    v-model="signup.username" 
                    type="text" 
                    placeholder="Username" 
                    required 
                    :disabled="loading"
                    class="w-full p-4 bg-secondary bg-opacity-5 border-0 rounded-lg placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20text-textdisabled:bg-opacity-10 disabled:cursor-not-allowedtransition-all"
                />
            </div>

            <div>
                <input 
                    v-model="signup.password" 
                    type="password" 
                    placeholder="Password" 
                    required 
                    :disabled="loading"
                    class="w-full p-4 bg-secondary bg-opacity-5 border-0 rounded-lg placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20text-textdisabled:bg-opacity-10 disabled:cursor-not-allowedtransition-all"
                />
            </div>

            <div>
                <input 
                    v-model="signup.blogname" 
                    type="text" 
                    placeholder="Blog Name" 
                    required 
                    :disabled="loading"
                    class="w-full p-4 bg-secondary bg-opacity-5 border-0 rounded-lg placeholder-secondary placeholder-opacity-25 focus:ring-secondary focus:ring-opacity-20text-textdisabled:bg-opacity-10 disabled:cursor-not-allowedtransition-all"
                />
            </div>

            <button 
                type="submit" 
                :disabled="loading"
                class="w-full py-4 bg-primary text-lg font-medium rounded-lg hover:bg-opacity-90 transition-alldisabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
                {{ loading ? 'Processing...' : 'Sign Up' }}
            </button>
        </div>
    </form>
</template>