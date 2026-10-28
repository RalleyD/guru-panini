<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import AppShell from "./components/AppShell.vue";
import { supabase } from "./lib/supabase";

const route = useRoute();
const router = useRouter();

async function signOut() {
	await supabase.auth.signOut({ scope: "local" });
	await router.push("/sign-in");
}
</script>

<template>
	<RouterView v-if="route.name === 'sign-in'" />
	<AppShell v-else :needs-you-count="0" @sign-out="signOut">
		<RouterView />
	</AppShell>
</template>
