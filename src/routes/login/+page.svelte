<script lang="ts">
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let submitting = $state<'github' | 'google' | null>(null);
</script>

<svelte:head>
  <title>Sign in · devopsdojo</title>
</svelte:head>

<main class="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between px-4">
  <div class="safe-top flex flex-1 flex-col justify-center gap-3 text-center">
    <h1 class="text-3xl font-bold tracking-tight">devopsdojo</h1>
    <p class="text-fg-muted text-base">De la zero la senior DevOps, o lecție scurtă pe zi.</p>
  </div>

  <!-- Buttons sit in the bottom half: that is where a thumb reaches (§13). -->
  <form method="POST" class="action-area flex flex-col gap-3 pt-6">
    <input type="hidden" name="next" value={data.next} />

    {#if form?.message}
      <p class="text-err text-sm" role="alert">{form.message}</p>
    {/if}

    <button
      type="submit"
      name="provider"
      value="github"
      class="bg-fg text-bg flex min-h-tap w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold active:opacity-80 disabled:opacity-60"
      disabled={submitting !== null}
      onclick={() => (submitting = 'github')}
    >
      {submitting === 'github' ? 'Se deschide GitHub…' : 'Continuă cu GitHub'}
    </button>

    <button
      type="submit"
      name="provider"
      value="google"
      class="border-border text-fg flex min-h-tap w-full items-center justify-center gap-2 rounded-xl border px-4 text-base font-semibold active:opacity-80 disabled:opacity-60"
      disabled={submitting !== null}
      onclick={() => (submitting = 'google')}
    >
      {submitting === 'google' ? 'Se deschide Google…' : 'Continuă cu Google'}
    </button>

    <p class="text-fg-muted pt-2 text-center text-xs">
      Ne autentificăm doar prin GitHub sau Google — nu stocăm parole.
    </p>
  </form>
</main>
