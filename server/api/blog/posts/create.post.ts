import { getServerSession } from '#auth'

type User = {
    name: string,
    email: string,
    id: string
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

    const sessionUser: unknown = session.user

    await event.context.prisma.post.create({
        data: {
            userId: (sessionUser as User).id,
            title: body.postTitle,
            description: body.postDescription,
            imageURL: body.imageURL,
        }
    })
})