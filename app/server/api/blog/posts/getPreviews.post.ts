/* 
    Body Structure:
    {
        page: number,
        pageSize: number,
        blog: blogTitle
    }
*/

export default eventHandler(async (event) => {
	const body = await readBody(event);

	const posts = await event.context.prisma.post.findMany({
		skip: (body.page - 1) * body.pageSize,
		take: body.pageSize,
		orderBy: {
			createdAt: "desc",
		},
		select: {
			id: true,
			ownerId: true,
			title: true,
			summary: true,
			tags: true,
			createdAt: true,
			updatedAt: true,
			published: true,
			heroImg: true,
			owner: {
				select: {
					name: true,
					image: true,
					website: true,
				},
			},
		},
		where: {
			blogId: body.blogId,
			published: true,
		},
	});

	return posts;
});
