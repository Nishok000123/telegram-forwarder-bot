<script lang="ts">
import type { Snippet } from "svelte";
import { cubicOut } from "svelte/easing";
import { prefersReducedMotion } from "svelte/motion";
import { fade, scale } from "svelte/transition";

// A question when given oncancel, a message to acknowledge when not: the one
// button dismisses, and so do Escape and the scrim.
let {
    title,
    confirmLabel,
    oncancel,
    onconfirm,
    children
}: {
    title: string;
    confirmLabel?: string;
    oncancel?: () => void;
    onconfirm: () => void;
    children: Snippet;
} = $props();

const label = $derived(confirmLabel ?? (oncancel ? "Confirm" : "OK"));

// JS transitions are outside the reduced-motion rule the stylesheet applies.
const ms = (full: number) => (prefersReducedMotion.current ? 0 : full);
const dismiss = () => (oncancel ?? onconfirm)();
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && dismiss()} />

<div
    class="scrim"
    role="presentation"
    onclick={dismiss}
    transition:fade={{ duration: ms(150) }}
>
    <!-- Stops a tap inside the dialog reaching the dismiss handler above. -->
    <div
        class="dialog"
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        aria-label={title}
        onclick={(e) => e.stopPropagation()}
        onkeydown={() => {}}
        in:scale={{ start: 0.96, duration: ms(200), easing: cubicOut }}
        out:scale={{ start: 0.98, duration: ms(120), easing: cubicOut }}
    >
        <h2>{title}</h2>
        {@render children()}
        <div class="actions">
            {#if oncancel}
                <button type="button" class="btn secondary" onclick={oncancel}>
                    Cancel
                </button>
            {/if}
            <button type="button" class="btn" onclick={onconfirm}>
                {label}
            </button>
        </div>
    </div>
</div>

<style>
/* --- dialog -------------------------------------------------------------- */

.scrim {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    padding: var(--gutter);
    background: rgba(0, 0, 0, 0.45);
}

.dialog {
    width: 100%;
    max-width: 320px;
    padding: 20px;
    border-radius: 15px;
    background: var(--section);
}

.dialog h2 {
    margin: 0 0 8px;
    font-size: 17px;
    font-weight: 600;
}

/* The body comes from the caller's snippet, so scoping cannot see it. */
.dialog :global(p) {
    margin: 0 0 10px;
    font-size: 14px;
    line-height: 1.45;
    color: var(--subtitle);
}
</style>
