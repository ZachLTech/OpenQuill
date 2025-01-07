import { getServerSession } from '#auth'
import { Blog } from '@prisma/client'

/* 
Body Structure:
{
    blogTitle: '',
    blogDescription: '',
    blogImage: '',
    blogTags: ['']
}
*/

type BlogUpdateInput = Partial<Pick<Blog, 'title' | 'description' | 'imageURL' | 'tags'>>

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

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The user attached to this session doesn\'t exist.'
        })
    }

    if (user && user.frozen) {
        throw createError({
            statusCode: 401,
            statusMessage: 'You are not authorized to call this API. You account is frozen.'
        })
    }

    const updateData: BlogUpdateInput = {}

    if (body.blogTitle && body.blogTitle != user.blog?.title) {
        checkSize(body.blogTitle)
        updateData.title = body.blogTitle
    }
    
    if (body.blogDescription && body.blogDescription != user.blog?.description) {
        checkSize(body.blogDescription)
        updateData.description = body.blogDescription
    }
    
    if (body.blogImage && body.blogImage != user.blog?.imageURL) {
        checkSize(body.blogImage)
        updateData.imageURL = body.blogImage
    }
    
    if (body.blogTags && body.blogTags != user.blog?.tags) {
        checkSize(body.blogTags)
        updateData.tags = body.blogTags
    }

    const updatedBlog = await event.context.prisma.blog.update({
        where: {
            title: user.blog?.title
        },
        data: updateData
    })

    return updatedBlog
})