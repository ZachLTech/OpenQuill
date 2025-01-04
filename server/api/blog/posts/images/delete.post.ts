import { getServerSession } from '#auth'

/* 
Body Structure:
{
    imageId: ''
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
            posts: true
        }
    })

    const image = await event.context.prisma.image.findUnique({
        where: {
            id: body.imageId
        },
        include: {
            post: {
                select: {
                    ownerId: true
                }
            }
        }
    })

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The user attached to this session doesn\'t exist.'
        })
    } else if (!image) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The user attached to this session doesn\'t have an image with that ID.'
        })
    } else if (user.id != image.post.ownerId) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The post being accessed doesn\'t belong to the user attached to this session.'
        })
    }

    await event.context.prisma.image.delete({
        where: {
            id: image.id
        }
    })
})