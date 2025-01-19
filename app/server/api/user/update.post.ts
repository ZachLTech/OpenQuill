import { getServerSession } from "#auth";
import { User } from "@prisma/client";
import { hash } from "bcrypt";

/* 
    Body Structure:
    {
        name: '',
        email: '',
        password: '',
        image: '',
        website: ''
    }
*/

type UserUpdateInput = Partial<
	Pick<User, "name" | "email" | "password" | "image" | "website">
>;

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
	const user = await event.context.prisma.user.findUnique({
		where: {
			email: userEmail as string | undefined,
		},
	});

	if (user && user.frozen) {
		throw createError({
			statusCode: 401,
			statusMessage:
				"You are not authorized to call this API. You account is frozen.",
		});
	}

	const updateData: UserUpdateInput = {};

	if (body.name && body.name != user?.name) {
		updateData.name = body.name;
	}

	if (body.email && body.email != user?.email) {
		updateData.email = body.email;
	}

	if (body.password && body.password != user?.password) {
		if (body.password != '') {
			if (body.password != 'Placeholder') {
				const hashedPassword = await hash(body.password, 10);
				updateData.password = hashedPassword;
			}
		}
	}

	if (body.image && body.image != user?.image) {
		updateData.image = body.image;
	}

	if (body.website && body.website != user?.website) {
		updateData.website = body.website;
	}

	const updatedUser = await event.context.prisma.user.update({
		where: {
			email: userEmail as string | undefined,
		},
		data: updateData,
	});

	return updatedUser;
});
