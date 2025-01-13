import { getServerSession } from '#auth'

/* 
    Body Structure:
    {
        page: number,
        pageSize: number,
        blog: blogTitle
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
            blog: {
                select: {
                    title: true
                }
            }
        }
    })

    if (!user) {
        throw createError({
            statusCode: 404,
            statusMessage: 'The user attached to this session doesn\'t exist.'
        })
    } else if (user.blog && user.blog.title != body.blog) {
        throw createError({
            statusCode: 401,
            statusMessage: 'You are not authorized to call this API. You do not own this blog.'
        })
    }

    const posts = await event.context.prisma.post.findMany({
        skip: (body.page - 1)*body.pageSize,
        take: body.pageSize,
        orderBy: {
            createdAt: 'desc'
        },
        select: {
            id: true,
            ownerId: true,
            title: true,
            summary: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
            published: true,
            heroImg: true,
            owner: {
                select: {
                    name: true,
                    image: true,
                    website: true
                }
            }
        },
        where: {
            blogId: body.blogId,
            published: false
        }
    })

    return posts
})