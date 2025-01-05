import { getServerSession } from '#auth'

/* 
Body Structure:
{
    postId: '',
    image: ''
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
            posts: true
        }
    })

    const post = await event.context.prisma.post.findUnique({
        where: {
            id: body.postId
        },
        include: {
            owner: {
                select: {
                    id: true
                }
            }
        }
    })

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The user attached to this session doesn\'t exist.'
        })
    } else if (!post) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The user attached to this session doesn\'t have a post with that ID.'
        })
    } else if (user.id != post.owner.id) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The post being accessed doesn\'t belong to the user attached to this session.'
        })
    }

    checkSize(body.image)

    const newImage = await event.context.prisma.image.create({
        data: {
            postId: body.postId,
            image: body.image
        }
    })

    return newImage
})