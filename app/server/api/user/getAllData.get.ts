import { getServerSession } from "#auth";

export default eventHandler(async (event) => {
	const session = await getServerSession(event);

	if (!session) {
		throw createError({
			statusCode: 401,
			statusMessage: "You are not authorized to call this API.",
		});
	}

	const userEmail = session.user?.email;
	const user = await event.context.prisma.user.findUnique({
		where: {
			email: userEmail as string | undefined,
		},
		select: {
			id: true,
			admin: true,
			frozen: true,
			name: true,
			email: true,
			website: true,
			image: true,
			createdAt: true,
			updatedAt: true,
			blog: {
				select: {
					title: true,
					description: true,
					imageURL: true,
					tags: true,
					createdAt: true,
				},
			},
		},
	});

	return user;
});
