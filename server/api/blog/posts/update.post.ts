import { getServerSession } from '#auth'
import { Post } from '@prisma/client'

/* 
Body Structure:
{
    postId: ''
    title: '',
    heroImg: '',
    summary: '',
    content: '',
    tags: [''],
    published: bool
}
*/

type PostUpdateInput = Partial<Pick<Post, 'title' | 'heroImg' | 'summary' | 'content' | 'tags' | 'published'>>

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
            statusCode: 404,
            statusMessage: 'The user attached to this session doesn\'t exist.'
        })
    } else if (!post) {
        throw createError({
            statusCode: 404,
            statusMessage: 'The post you\'re trying to update doesn\'t exist.'
        })
    } else if (post.owner.id != user.id) {
        throw createError({
            statusCode: 401,
            statusMessage: 'The post you\'re trying to update doesn\'t belong to you.'
        })
    }

    const updateData: PostUpdateInput = {}

    if (body.title != undefined && body.title != post.title) {
        updateData.title = body.title
    }

    if (body.heroImg != undefined && body.heroImg != post.heroImg) {
        updateData.heroImg = body.heroImg
    }

    if (body.content != undefined && body.content != post.content) {
        updateData.content = body.content
    }

    if (body.tags != undefined && body.tags != post.tags) {
        updateData.tags = body.tags
    }

    if (body.published != undefined && body.published != post.published) {
        updateData.published = body.published
    }

    const updatedPost = await event.context.prisma.post.update({
        where: {
            id: post.id
        },
        data: updateData
    })

    return updatedPost
})