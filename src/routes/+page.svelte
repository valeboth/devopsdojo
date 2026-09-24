<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>devopsdojo</title>
  <meta name="description" content="De la zero la senior DevOps, o lecție scurtă pe zi." />
</svelte:head>

<main class="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between px-4">
  <div class="safe-top flex flex-1 flex-col justify-center gap-5">
    <h1 class="text-3xl font-bold tracking-tight">devopsdojo</h1>
    <p class="text-fg-muted text-base">
      Linux, Docker, Kubernetes, Terraform, CI/CD și cloud — from zero to hero.
    </p>

    <!-- Sits with the hero rather than pinned to the bottom: on a landing page
         with a single call to action, mid-screen is still thumb-reachable. -->
    {#if !data.user}
      <a
        href={resolve('/login')}
        class="bg-accent text-accent-fg mt-1 flex min-h-tap w-full items-center justify-center rounded-xl px-4 text-base font-semibold active:opacity-80"
      >
        Start
      </a>
    {/if}
  </div>

  {#if data.user}
    <!-- Phase 0 acceptance: an empty dashboard with streak 0. The streak service,
         the three mode buttons and the due counter arrive in Phase 1, so this is
         hardcoded rather than pretending to be live data. -->
    <div class="action-area flex flex-col gap-3 pt-6">
      <div class="border-border flex items-center justify-between rounded-xl border px-4 py-3">
        <span class="text-fg-muted text-base">Streak</span>
        <span class="text-2xl font-bold tabular-nums">0</span>
      </div>
      <p class="text-fg-muted text-sm">
        Salut, {data.user.name}. Încă nu există conținut — lecțiile apar în faza următoare.
      </p>
    </div>
  {/if}
</main>
