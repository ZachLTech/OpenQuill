<script setup lang="ts">
// All initial logic declarations
const { status } = useAuth();

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
