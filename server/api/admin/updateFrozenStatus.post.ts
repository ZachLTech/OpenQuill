import { getServerSession } from "#auth";

/* 
Body Structure:
{
    userToUpdate: {
        email: <email of user being altered>
    }
}
*/

export default eventHandler(async (event) => {
	const body = await readBody(event);
	const session = await getServerSession(event);

	if (!session) {
		throw createError({
			statusCode: 401,
			statusMessage: "You are not authorized to call this API.",
		});
	}

	const userEmail = session.user?.email;
	const userData = await event.context.prisma.user.findUnique({
		where: {
			email: userEmail as string | undefined,
		},
	});

	if (!userData?.admin) {
		throw createError({
			statusCode: 401,
			statusMessage:
				"You are not authorized to call this API. You are not an admin.",
		});
	}

	const userToUpdate = await event.context.prisma.user.findUnique({
		where: {
			email: body.userToUpdate.email,
		},
	});

	if (userToUpdate && userToUpdate.frozen) {
		await event.context.prisma.user.update({
			where: {
				email: body.userToUpdate.email,
			},
			data: {
				frozen: false,
			},
		});
	} else if (userToUpdate && !userToUpdate.frozen) {
		await event.context.prisma.user.update({
			where: {
				email: body.userToUpdate.email,
			},
			data: {
				frozen: true,
			},
		});
	} else {
		throw createError({
			statusCode: 422,
			statusMessage:
				"The user data you're trying to alter doesn't exist.",
		});
	}
});
