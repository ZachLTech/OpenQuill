/* 
Body Structure:
{
    email: 
}
*/

export default eventHandler(async event => {
    const body = await readBody(event)
    const user = await event.context.prisma.user.findUnique({
        where: {
            email: body.email
        },
        select: {
            website: true
        }
    })

    return user
})