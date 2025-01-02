import { hash } from 'bcrypt'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        
        if (!body.email || !body.password) {
            throw createError({
                statusCode: 400,
                message: 'Email and password are required'
            })
        }

        // Check if user exists
        const exists = await event.context.prisma.user.findUnique({
            where: { email: body.email }
        })

        if (exists) {
            throw createError({
                statusCode: 400,
                message: 'User already exists'
            })
        }

        // Create new user
        const hashedPassword = await hash(body.password, 10)
        const user = await event.context.prisma.user.create({
            data: {
                email: body.email,
                name: body.username,
                password: hashedPassword,
                account: {
                    create: {
                        type: 'credentials',
                        provider: 'credentials',
                        providerAccountId: body.email,
                        subscribed: false
                    }
                }
            }
        })

        return {
            id: user.id,
            email: user.email,
            name: user.name
        }
    } catch (error: any) {
        throw createError({
            statusCode: error.statusCode || 500,
            message: error.message || 'Internal server error'
        })
    }
})