import { getServerSession } from '#auth'

export default eventHandler(async event => {
    const body = await readBody(event)
    const session = await getServerSession(event)

    // Just making sure they're allowed to do this :)
    if (!session){
        throw createError({
            statusCode: 401,
            statusMessage: 'You are not authorized to call this API.'
        })
    }

    const requestUser = await event.context.prisma.user.findUnique({
        where: {
            email: body.email
        }
    })

    if (!requestUser || requestUser.email != session.user?.email) {
        throw createError({
            statusCode: 401,
            statusMessage: 'You are not authorized to call this API. You are not who you say you are.'
        })
    }  else if (requestUser && requestUser.email == session.user.email && !requestUser.admin) {
        throw createError({
            statusCode: 401,
            statusMessage: 'You are not authorized to call this API. You are not an admin.'
        })
    }

    // Ok by this point they are in fact the user they said they are AND they're an admin.
    const userToUpdate = await event.context.prisma.user.findUnique({
        where: {
            email: body.userToUpdate.email
        }
    })

    if (userToUpdate && userToUpdate.admin) {
        await event.context.prisma.user.update({
            where: {
                email: body.userToUpdate.email
            },
            data: {
                admin: false
            }
        })
    } else if (userToUpdate && !userToUpdate.admin) {
        await event.context.prisma.user.update({
            where: {
                email: body.userToUpdate.email
            },
            data: {
                admin: true
            }
        })
    } else {
        throw createError({
            statusCode: 422,
            statusMessage: 'The user data you\'re trying to alter doesn\'t exist.'
        })
    }
})