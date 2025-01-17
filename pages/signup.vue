<script setup lang="ts">
// All initial logic declarations
const { status } = useAuth();
const platformTitle = useRuntimeConfig().public.platformTitle;

useSeoMeta({
  title: `${platformTitle} - Login` || 'OpenQuill - Login',
  ogTitle: `${platformTitle} - Login` || 'OpenQuill - Login',
  description: `Login to ${platformTitle}`,
  ogDescription: `Login to ${platformTitle}`,
})

if (status.value === "authenticated") {
	navigateTo("/");
}
</script>

<template>
	<appNav />

	<div class="px-4 sm:mx-0">
		<signupForm class="mt-[15vh]" />
	</div>
</template>
