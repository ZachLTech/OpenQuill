/* 
    Body Structure:
    {
        page: number,
        pageSize: number
        blogId: id
    }
*/

export default eventHandler(async event => {
    const body = await readBody(event)
    let posts

    if (body.blog) {
        posts = await event.context.prisma.post.findMany({
            where: {
                published: true,
                blogId: body.blogId
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip: (body.page - 1)*body.pageSize,
            take: body.pageSize,
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
            }
        })
    } else {
        posts = await event.context.prisma.post.findMany({
            where: {
                published: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip: (body.page - 1)*body.pageSize,
            take: body.pageSize,
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
            }
        })
    }

    return posts
})