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

    const updateData: BlogUpdateInput = {}

    if (body.blogTitle != undefined && body.blogTitle != user.blog?.title) {
        updateData.title = body.blogTitle
    }
    
    if (body.blogDescription != undefined && body.blogDescription != user.blog?.description) {
        updateData.description = body.blogDescription
    }
    
    if (body.blogImage != undefined && body.blogImage != user.blog?.imageURL) {
        updateData.imageURL = body.blogImage
    }
    
    if (body.blogTags && body.blogTags != user.blog?.tags) {
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