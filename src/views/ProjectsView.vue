<script setup lang="ts"></script>

<template>
	<header class="projects-header">
		<h1 class="h1">Projects</h1>
		<RouterLink to="/projects/new" class="btn btn-primary">New project</RouterLink>
	</header>
</template>

<style scoped>
.projects-header {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: 20px;
}
</style>
