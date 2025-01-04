import { getServerSession } from '#auth'

/* 
Body Structure:
{
    postId: '',
    image: ''
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

    const post = await event.context.prisma.post.findUnique({
        where: {
            id: body.postId
        },
        include: {
            owner: {
                select: {
                    id: true
                }
            }
        }
    })

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The user attached to this session doesn\'t exist.'
        })
    } else if (!post) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The user attached to this session doesn\'t have a post with that ID.'
        })
    } else if (user.id != post.owner.id) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The post being accessed doesn\'t belong to the user attached to this session.'
        })
    }

    const newImage = await event.context.prisma.image.create({
        data: {
            postId: body.postId,
            image: body.image
        }
    })

    return newImage
})