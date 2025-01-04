/* 
Body Structure:
{
    blog: blogId
}
*/

export default eventHandler(async event => {
    const body = await readBody(event)

    const postsLen = await event.context.prisma.post.count({
        where: {
            blogId: body.blogId
        }
    })
    
    return postsLen
})