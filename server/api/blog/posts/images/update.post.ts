import { getServerSession } from '#auth'
import { Image } from '@prisma/client'

/* 
Body Structure:
{
    imageId: ''
    image: '',
    alt: '',
    caption: '',
}
*/

type ImageUpdateInput = Partial<Pick<Image, 'image' | 'alt' | 'caption'>>

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
        }
    })

    if (user && user.frozen) {
        throw createError({
            statusCode: 401,
            statusMessage: 'You are not authorized to call this API. You account is frozen.'
        })
    }

    const image = await event.context.prisma.image.findUnique({
        where: {
            id: body.imageId
        },
        include: {
            post: {
                select: {
                    ownerId: true
                }
            }
        }
    })

    if (!user) {
        throw createError({
            statusCode: 404,
            statusMessage: 'The user attached to this session doesn\'t exist.'
        })
    } else if (!image) {
        throw createError({
            statusCode: 404,
            statusMessage: 'The image you\'re trying to update doesn\'t exist.'
        })
    } else if (image.post.ownerId != user.id) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The image you\'re trying to update doesn\'t belong to you.'
        })
    }

    const updateData: ImageUpdateInput = {}

    if (body.image != undefined && body.image != image.image) {
        checkSize(body.image)
        updateData.image = body.image
    }

    if (body.alt != undefined && body.alt != image.alt) {
        checkSize(body.alt)
        updateData.alt = body.alt
    }

    if (body.caption != undefined && body.caption != image.caption) {
        checkSize(body.caption)
        updateData.caption = body.caption
    }

    const updatedImage = await event.context.prisma.image.update({
        where: {
            id: image.id
        },
        data: updateData
    })

    return updatedImage
})