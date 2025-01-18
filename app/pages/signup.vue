<script setup lang="ts">
// All initial logic declarations
const { status } = useAuth();
const platformTitle = useRuntimeConfig().public.platformTitle;
let allowSignups = (useRuntimeConfig().allowSignups as string)

useSeoMeta({
  title: `${platformTitle} - Login` || 'OpenQuill - Login',
  ogTitle: `${platformTitle} - Login` || 'OpenQuill - Login',
  description: `Login to ${platformTitle}`,
  ogDescription: `Login to ${platformTitle}`,
})

if (status.value === "authenticated") {
	navigateTo("/");
} else if (allowSignups != 'true') {
	navigateTo("/login")
}
</script>

<template>
	<appNav />

	<div class="px-4 sm:mx-0">
		<signupForm class="mt-[15vh]" />
	</div>
</template>
