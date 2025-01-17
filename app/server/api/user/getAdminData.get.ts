export default eventHandler(async (event) => {
	const admins = await event.context.prisma.user.findMany({
		where: {
			admin: true,
		},
		select: {
			email: true,
		},
	});

	return admins;
});
