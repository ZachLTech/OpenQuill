export default eventHandler(async event => {
    let allowsSignup = useRuntimeConfig().allowSignups
    const usrCount = await event.context.prisma.user.count()

    if (usrCount == 0) {
        allowsSignup = true
    }

    return allowsSignup
})