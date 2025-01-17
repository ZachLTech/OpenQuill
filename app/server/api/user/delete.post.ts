import { getServerSession } from "#auth";

export default eventHandler(async (event) => {
	const session = await getServerSession(event);

	if (!session) {
		throw createError({
			statusCode: 401,
			statusMessage: "You are not authorized to call this API.",
		});
	}

	const userEmail = session.user?.email as string | undefined;

	const isAdmin = await event.context.prisma.user.findUnique({
		where: { email: userEmail },
		select: { 
			admin: true,
			frozen: true,
		 },
	});

	if (isAdmin?.admin) {
		const adminCount = await event.context.prisma.user.count({
			where: { admin: true },
		});
		if (adminCount <= 1) {
			throw createError({
				statusCode: 400,
				statusMessage: "Cannot delete the last admin user.",
			});
		}
	} else if (isAdmin?.frozen) {
		throw createError({
			statusCode: 400,
			statusMessage: "You can't delete your account while it's frozen.",
		});
	}

	await event.context.prisma.user.delete({
		where: {
			email: userEmail,
		},
	});
});
