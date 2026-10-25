<script setup lang="ts">
import AppShell from "./components/AppShell.vue";
</script>

<template>
	<AppShell :needs-you-count="0">
		<RouterView />
	</AppShell>
</template>
