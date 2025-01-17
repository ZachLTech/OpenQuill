<script setup lang="ts">
// All initial logic declarations
const props = defineProps<{
	isOpen: boolean;
	title: string;
	message: string;
}>();

const emit = defineEmits(["confirm", "cancel"]);
</script>

<template>
	<Transition
		enter-active-class="transition duration-200 ease-out"
		enter-from-class="transform scale-95 opacity-0"
		enter-to-class="transform scale-100 opacity-100"
		leave-active-class="transition duration-150 ease-in"
		leave-from-class="transform scale-100 opacity-100"
		leave-to-class="transform scale-95 opacity-0"
	>
		<div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
			<div class="flex min-h-screen items-center justify-center p-4">
				<div
					class="fixed inset-0 bg-opacity-30"
					@click="emit('cancel')"
				></div>
				<div
					class="relative bg-[#1b1c1d] bg-opacity-90 rounded-lg p-8 max-w-md w-full"
				>
					<h3 class="text-lg font-medium text-text mb-4">
						{{ title }}
					</h3>
					<p class="text-gray-400 mb-6">{{ message }}</p>
					<div class="flex justify-end gap-4">
						<button
							@click="emit('cancel')"
							class="px-4 py-2 rounded bg-secondary bg-opacity-10 text-text hover:bg-opacity-20 transition-all"
						>
							Cancel
						</button>
						<button
							@click="emit('confirm')"
							class="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition-all"
						>
							Delete
						</button>
					</div>
				</div>
			</div>
		</div>
	</Transition>
</template>
