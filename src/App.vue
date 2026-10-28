<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppShell from "./components/AppShell.vue";
import { agencyName, setAgencyName } from "./lib/settings";
import { supabase } from "./lib/supabase";

const route = useRoute();
const router = useRouter();

// The brand text stays empty until the load ends, so the fallback never flashes.
async function loadAgencyName() {
	agencyName.value = "";
	const { data, error } = await supabase
		.from("settings")
		.select("agency_name")
		.maybeSingle();
	setAgencyName(error ? null : data?.agency_name);
}

// Loads again each time a signed-in route shows after the sign-in page.
const shellShown = computed(() => route.name !== "sign-in");
watch(
	shellShown,
	(shown) => {
		if (shown) loadAgencyName();
	},
	{ immediate: true },
);

async function signOut() {
	await supabase.auth.signOut({ scope: "local" });
	await router.push("/sign-in");
}
</script>

<template>
	<RouterView v-if="!shellShown" />
	<AppShell v-else :agency-name="agencyName" :needs-you-count="0" @sign-out="signOut">
		<RouterView />
	</AppShell>
</template>
