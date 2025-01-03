import { getServerSession } from '#auth'
import { Blog } from '@prisma/client'

/* 
Body Structure:
{
    email: <requester email>
    blogUpdates: {
        blogTitle: '',
        blogDescription: '',
        blogImage: '',
        blogTags: ['']
    }
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

    const requestUser = await event.context.prisma.user.findUnique({
        where: {
            email: body.email
        },
        include: {
            blog: true
        }
    })

    if (!requestUser || requestUser.email != session.user?.email) {
        throw createError({
            statusCode: 401,
            statusMessage: 'You are not authorized to call this API. You are not who you say you are.'
        })
    } 

    const updateData: BlogUpdateInput = {}

    if (body.blogUpdates.blogTitle != undefined && body.blogUpdates.blogTitle != requestUser.blog?.title) {
        updateData.title = body.blogUpdates.blogTitle
    }
    
    if (body.blogUpdates.blogDescription != undefined && body.blogUpdates.blogDescription != requestUser.blog?.description) {
        updateData.description = body.blogUpdates.blogDescription
    }
    
    if (body.blogUpdates.blogImage != undefined && body.blogUpdates.blogImage != requestUser.blog?.imageURL) {
        updateData.imageURL = body.blogUpdates.blogImage
    }
    
    if (body.blogUpdates.blogTags && body.blogUpdates.blogTags != requestUser.blog?.tags) {
        updateData.tags = body.blogUpdates.blogTags
    }

    const updatedBlog = await event.context.prisma.blog.update({
        where: {
            title: requestUser.blog?.title
        },
        data: updateData
    })

    return updatedBlog
})