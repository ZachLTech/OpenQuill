import { hash } from "bcrypt";

export default defineEventHandler(async (event) => {
	try {
		const body = await readBody(event);
		let allowSignups = useRuntimeConfig().allowSignups as string | null
		let admin = false;

		if (allowSignups && allowSignups.toLowerCase() != 'true') {
			throw createError({
				statusCode: 403,
				message: "Signups are currently disabled",
			});
		}

		if (!body.email || !body.password) {
			throw createError({
			statusCode: 400,
			message: "Email and password are required",
			});
		}

		const exists = await event.context.prisma.user.findUnique({
			where: { email: body.email },
		});

		if (exists) {
			throw createError({
				statusCode: 400,
				message: "User already exists",
			});
		}

		const usrCount = await event.context.prisma.user.count();
		if (usrCount == 0) {
			admin = true;
		}

		const hashedPassword = await hash(body.password, 10);
		const user = await event.context.prisma.user.create({
			data: {
				admin: admin,
				email: body.email,
				name: body.username,
				password: hashedPassword,
			},
		});

		return {
			id: user.id,
			email: user.email,
			name: user.name,
		};
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || "Internal server error",
		});
	}
});
