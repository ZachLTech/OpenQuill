/* 
Body Structure:
{
    blogTitle:
}
*/

export default eventHandler(async event => {
    const body = await readBody(event)
    
    const blog = await event.context.prisma.blog.findUnique({
        where: {
            title: body.blogTitle
        }
    })

    return blog? true : false
})