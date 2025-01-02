export default eventHandler(async event => {
    const postsLen = await event.context.prisma.post.count()
    return postsLen
})