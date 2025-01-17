import { getServerSession } from "#auth";

/* 
    Body Structure:
    {
        blog: blogId
    }
*/

export default eventHandler(async (event) => {
	const body = await readBody(event);
	const session = await getServerSession(event);
	let postsLen = 0;

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
		include: {
			blog: {
				select: {
					title: true,
				},
			},
		},
	});

	if (!user) {
		throw createError({
			statusCode: 404,
			statusMessage: "The user attached to this session doesn't exist.",
		});
	} else if (user.blog && user.blog.title != body.blog) {
		throw createError({
			statusCode: 401,
			statusMessage:
				"You are not authorized to call this API. You do not own this blog.",
		});
	}

	postsLen = await event.context.prisma.post.count({
		where: {
			blogId: body.blogId,
			published: false,
		},
	});

	return postsLen;
});
