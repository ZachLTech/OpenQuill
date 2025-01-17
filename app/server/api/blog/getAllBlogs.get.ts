export default eventHandler(async (event) => {
	const blogData = await event.context.prisma.blog.findMany({
		include: {
			owner: {
				select: {
					image: true,
					name: true,
					website: true,
				},
			},
			posts: {
				where: {
					published: true,
				},
				select: {
					id: true,
				},
			},
		},
	});
	return blogData;
});
