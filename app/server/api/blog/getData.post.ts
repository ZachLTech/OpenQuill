/* 
    Body Structure:
    {
        blogTitle:
    }
*/

export default eventHandler(async (event) => {
	const body = await readBody(event);

	const blogData = await event.context.prisma.blog.findUnique({
		where: {
			title: body.blogTitle,
		},
		include: {
			owner: {
				select: {
					name: true,
					image: true,
					website: true,
				},
			},
		},
	});

	return blogData;
});
