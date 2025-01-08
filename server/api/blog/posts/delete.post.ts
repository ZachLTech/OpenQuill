import { getServerSession } from '#auth'

/* 
    Body Structure:
    {
        post: <TYPE POST>
    }
*/

export default eventHandler(async event => {
    const body = await readBody(event)
    const session = await getServerSession(event)

    if (!session){
        throw createError({
            statusCode: 401,
            statusMessage: 'You are not authorized to call this API.'
        })
    }

    const userEmail = session.user?.email
    const user = await event.context.prisma.user.findUnique({
        where: {
            email: (userEmail as string | undefined)
        },
        include: {
            blog: true
        }
    })

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The user attached to this session doesn\'t exist.'
        })
    } else if (!user.blog) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The user attached to this session doesn\'t have a blog.'
        })
    } else if (user.id != body.post.ownerId) {
        throw createError({
            statusCode: 401,
            statusMessage: 'You do not own this post.'
        })
    }

    await event.context.prisma.post.delete({
        where: {
            id: body.post.id
        }
    })
})