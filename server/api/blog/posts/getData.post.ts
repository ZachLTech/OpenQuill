/* 
Body Structure:
{
    postId: string
}
*/

export default eventHandler(async event => {
    const body = await readBody(event)

    const postData = await event.context.prisma.post.findUnique({
        where: {
            id: body.postId
        },
        include: {
            owner: {
                select: {
                    name: true,
                    image: true,
                    website: true
                }
            },
            blog: {
                select: {
                    title: true,
                    imageURL: true
                }
            },
            images: true
        }
    })

    return postData
})