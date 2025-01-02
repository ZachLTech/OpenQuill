export default eventHandler(async event => {
    const body = await readBody(event)
    const query = await getQuery(event)
    const config = useRuntimeConfig()

    if (query.API_ROUTE_SECRET !== config.API_ROUTE_SECRET){
        throw createError({
            statusCode: 401,
            statusMessage: 'You are not authorized to call this API.'
        })
    }

    const account = await event.context.prisma.account.findFirst({
        where: {
            user: {
                email: body.email,
            }
        }
    })

    return account
})