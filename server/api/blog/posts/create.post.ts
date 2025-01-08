import { getServerSession } from '#auth'

/* 
    Body Structure:
    {
        title: '',
    }
*/

function checkSize(input: any) {
    if (input) {
        try {
            if (Array.isArray(input)) {    
                input.reduce((total: any, item: any) => {
                    return total + Buffer.from(item).length;
                }, 0);
            }
            const inputSize = Buffer.from(input).length
            if (inputSize > 15 * 1024 * 1024) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'Input size must be less than 15MB'
                })
            }
        } catch (e) {
            throw createError({
                statusCode: 500,
                statusMessage: `Something went wrong...\n\n ERROR: ${e}`
            })
        }
    }
}

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

    if (user && user.frozen) {
        throw createError({
            statusCode: 401,
            statusMessage: 'You are not authorized to call this API. You account is frozen.'
        })
    }

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

    checkSize(body.title)

    const newPost = await event.context.prisma.post.create({
        data: {
            ownerId: user.id,
            blogId: user.blog.id,
            title: body.title,
        }
    })

    return newPost
})