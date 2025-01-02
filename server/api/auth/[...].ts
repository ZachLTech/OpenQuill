import { NuxtAuthHandler } from '#auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'

const config = useRuntimeConfig()
const prisma = new PrismaClient()

async function getUser(session: any) {
    return await $fetch('/api/UserData', {
        method: 'POST',
        query: {
            API_ROUTE_SECRET: config.API_ROUTE_SECRET,
        },
        body: {
            email: session?.user?.email   
        },
    })
}

export default NuxtAuthHandler({
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt"
    },
    secret: config.authSecret,
    adapter: PrismaAdapter(prisma),
    callbacks: {
        session: async ({ session, token }) => {
            const user = await getUser(session);
            (session as any).user.id = token.sub;
            (session as any).subscribed = user?.subscribed;
            return Promise.resolve(session);
        },
        jwt: async ({ token, user }) => {
            if (user) {
                token.sub = user.id;
            }
            return token;
        }
    },
    providers: [
        // @ts-expect-error You need to use .default here for it to work during SSR
        CredentialsProvider.default({
            name: 'credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials: any) {
                if (!credentials?.email || !credentials?.password) {
                    console.log('Missing credentials')
                    return null
                }

                try {
                    const user = await $fetch('/api/auth/login', {
                        method: 'POST',
                        body: {
                            email: credentials.email,
                            password: credentials.password
                        }
                    })
                    return user
                } catch (error: any) {
                    console.error('Auth error:', error)
                    return null
                }
            }
        })
    ]
})