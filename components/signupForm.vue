<script setup lang="ts">
const signup = ref({ email: '', username: '', password: '' })
const login = ref({ email: '', password: '' })
const error = ref('')
const loading = ref(false)
const { signIn } = useAuth()

function validateInput(signupInput: any): string {
    const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
    const usernameRegex = /^[0-9A-Za-z]{2,16}$/
    const passwordRegex = /^(?=.*?[A-Z])(?=.*?[0-9]).{8,}$/

    if (!emailRegex.test(signupInput?.email)) {
        return 'The Email you entered is not valid.'
    } else if (!usernameRegex.test(signupInput?.username)) {
        return 'Username should be between 2 and 16 characters. Alphanumeric only.'
    } else if (!passwordRegex.test(signupInput?.password)) {
        return 'Password should be at least 8 characters including a number and uppercase letter'
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
    <form @submit.prevent="handleSignup">
        <h2>Signup</h2>
        <p>
            Have an account? 
            <NuxtLink to="/login">Log In</NuxtLink>
        </p>
        <p v-if="error">{{ error }}</p>
        <input 
            v-model="signup.email" 
            type="email" 
            placeholder="Email" 
            required 
            :disabled="loading"
        />
        <input 
            v-model="signup.username" 
            type="text" 
            placeholder="Username" 
            required 
            :disabled="loading"
        />
        <input 
            v-model="signup.password" 
            type="password" 
            placeholder="Password" 
            required 
            :disabled="loading"
        />
        <button type="submit" :disabled="loading">
            {{ loading ? 'Processing...' : 'Signup' }}
        </button>
    </form>
</template>