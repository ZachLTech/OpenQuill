/* 
    Body Structure:
    {
        blog: blogId
    }
*/

export default eventHandler(async event => {
    const body = await readBody(event)
    let postsLen = 0

    if (body.blogId != '*') {
        postsLen = await event.context.prisma.post.count({
            where: {
                blogId: body.blogId,
                published: true
            }
        })
    }  else if (body.blogId == '*') {
        postsLen = await event.context.prisma.post.count({
            where: {
                published: true
            }
        })
    }
    
    
    return postsLen
})