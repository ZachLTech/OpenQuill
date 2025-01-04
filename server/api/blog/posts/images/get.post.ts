/* 
Body Structure:
{
    imageId: string
}
*/

export default eventHandler(async event => {
    const body = await readBody(event)

    const imageData = await event.context.prisma.image.findUnique({
        where: {
            id: body.imageId
        }
    })

    return imageData
})