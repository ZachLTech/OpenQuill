import { compare } from 'bcrypt'

export default eventHandler(async (event) => {
    const body = await readBody(event)

    const user = await event.context.prisma.user.findUnique({
        where: { email: body.email },
        include: {
            account: true
        }
    })

    if (!user || !user.password) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid credentials'
        })
    }

    const isValid = await compare(body.password, user.password)

    if (!isValid) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid credentials'
        })
    }

    return { 
        id: user.id,
        email: user.email,
        name: user.name,
        subscribed: user.account?.[0]?.subscribed || false
    }
})