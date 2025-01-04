import { getServerSession } from '#auth'

/* 
Body Structure:
{
    title: '',
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
            blog: true
        }
    })

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The user attached to this session doesn\'t exist.'
        })
    } else if (!user.blog) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The user attached to this session doesn\'t have a blog.'
        })
    }
    
    if (!body.title) {
        const now = new Date()
        const date = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`
        const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`
        body.title = `${date} - ${time}`
    }

    const newPost = await event.context.prisma.post.create({
        data: {
            ownerId: user.id,
            blogId: user.blog.id,
            title: body.title,
        }
    })

    return newPost
})