export default eventHandler(async event => {
    const blogData = await event.context.prisma.blog.findMany()
    return blogData
})