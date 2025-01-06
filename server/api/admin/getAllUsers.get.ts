import { getServerSession } from '#auth'

export default eventHandler(async event => {
    const session = await getServerSession(event)

    if (!session){
        throw createError({
            statusCode: 401,
            statusMessage: 'You are not authorized to call this API.'
        })
    }

    const userEmail = session.user?.email
    const userData = await event.context.prisma.user.findUnique({
        where: {
            email: (userEmail as string | undefined)
        }
    })

    if (!userData?.admin) {
        throw createError({
            statusCode: 401,
            statusMessage: 'You are not authorized to call this API. You are not an admin.'
        })
    }

    const allUsers = await event.context.prisma.user.findMany({
        select: {
            id: true,
            admin: true,
            website: true,
            frozen: true,
            name: true,
            email: true,
            password: false,
            image: true,
            createdAt: true,
            updatedAt: true,
            blog: true
        }
    })

    return allUsers
})