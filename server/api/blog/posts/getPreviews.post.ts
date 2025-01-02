export default eventHandler(async event => {
    const body = await readBody(event)

    const posts = await event.context.prisma.post.findMany({
        skip: (body.page - 1)*body.pageSize,
        take: body.pageSize,
        include: {
            user: true
        }
    })

    return posts
})