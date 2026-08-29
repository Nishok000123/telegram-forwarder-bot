<script lang="ts">
import { cubicOut } from "svelte/easing";
import { prefersReducedMotion } from "svelte/motion";
import { slide } from "svelte/transition";
import * as api from "../api";
import ActionRow from "../components/ActionRow.svelte";
import BackBar from "../components/BackBar.svelte";
import Hero from "../components/Hero.svelte";
import Page from "../components/Page.svelte";
import { ask } from "../dialog.svelte";
import { impact, run } from "../haptics";
import { close, copyText, myId } from "../telegram";

let { onback, backLabel = "Back" }: { onback: () => void; backLabel?: string } =
    $props();

let input = $state("");
let busy = $state(false);
let error = $state("");
let handedTo = $state<number | null>(null);
let copied = $state(false);

const mine = myId();

// Only for bots Telegram created: the manager holds their tokens.
let managed = $state(false);
let managedBusy = $state(false);
// Its own, so a failure here never renders as a rejected user id below.
let managedError = $state("");

// A JS transition is outside the stylesheet's reduced-motion rule.
const ms = (full: number) => (prefersReducedMotion.current ? 0 : full);
api.managedState()
    .then((state) => {
        managed = state.managed;
    })
    .catch(() => {
        // Not managed, or the manager is not running: the section stays hidden.
    });

async function patchManaged(patch: { rotate?: boolean; remove?: boolean }) {
    if (managedBusy) return;
    managedBusy = true;
    managedError = "";
    try {
        await run(() => api.updateManaged(patch));
    } catch (e: any) {
        managedError = e.message;
    } finally {
        managedBusy = false;
    }
}

/** No Bot API method deletes a bot; @BotFather is the only place. */
async function removeBot() {
    if (
        !(await ask(
            "Delete this bot's setup?",
            [
                "Everything it forwards, and every rule you have set, is deleted here for good.",
                "The bot itself stays on Telegram, and stops until you set it up again. Delete it in @BotFather if you want it gone entirely."
            ],
            "Delete"
        ))
    ) {
        return;
    }
    await patchManaged({ remove: true });
    if (!managedError) close();
}

async function replaceToken() {
    if (
        !(await ask(
            "Replace this bot's token?",
            "The current one stops working immediately, so anything else using it — another host, a script — stops with it. Forwarding here continues on the new token.",
            "Replace"
        ))
    ) {
        return;
    }
    await patchManaged({ rotate: true });
}

async function copyMine() {
    if (mine === undefined || !(await copyText(String(mine)))) return;
    copied = true;
    impact();
    setTimeout(() => (copied = false), 1600);
}

async function handOver() {
    const target = input.trim();
    if (!target) return;
    if (
        !(await ask(
            `Hand this bot to ${target}?`,
            "You lose access immediately. Only they can hand it back.",
            "Hand over"
        ))
    ) {
        return;
    }

    busy = true;
    error = "";
    try {
        handedTo = await run(() => api.handOver(target));
    } catch (e: any) {
        error = e.message;
    } finally {
        busy = false;
    }
}
</script>

<Page>
    {#if !handedTo}
        <BackBar {onback} label={backLabel} />
    {/if}

    <Hero icon="owner" title="Owner">
        {handedTo
            ? "This bot has a new owner."
            : "Only the owner can open these settings or change what the bot forwards."}
    </Hero>

    {#if handedTo}
        <div class="card">
            <div class="field">
                <p class="prose">
                    This bot now belongs to <b>{handedTo}</b>. Your forwarding rules
                    stayed as they are — they are the bot's, not yours. Ask the new
                    owner if you need it back.
                </p>
            </div>
        </div>

        <div class="actions-stack">
            <button type="button" class="btn" onclick={close}>Back to the chat</button>
        </div>
    {:else}
        <div class="card">
            {#if mine !== undefined}
                <button type="button" class="row" onclick={copyMine}>
                    <span class="grow">
                        <span class="row-label">Your id</span>
                        <span class="sub">{copied ? "Copied" : "Tap to copy"}</span>
                    </span>
                    <span class="cid"><span class="pre">{mine}</span></span>
                </button>
            {/if}
        </div>

        {#if managed}
            <div
                class="reveal"
                transition:slide={{ duration: ms(260), easing: cubicOut }}
            >
            <h2 class="section-title">This bot</h2>
            <div class="card inset-rules">
                <ActionRow
                    icon="key"
                    label={managedBusy ? "Working…" : "Replace token"}
                    disabled={managedBusy}
                    onclick={replaceToken}
                />
                <ActionRow
                    icon="trash"
                    tone="destructive"
                    label="Delete setup"
                    disabled={managedBusy}
                    onclick={removeBot}
                />
            </div>
            {#if managedError}<p class="note invalid-note">{managedError}</p>{/if}
            <p class="note">
                Telegram created this bot for me, so I can change its token
                without @BotFather. Deleting removes what it forwards from here;
                the bot itself is only ever deleted in @BotFather.
            </p>
            </div>
        {/if}

        <h2 class="section-title">Hand it over</h2>
        <div class="card">
            <input
                class="input {/^-?\d+$/.test(input.trim()) ? 'mono' : ''} {error
                    ? 'invalid'
                    : ''}"
                type="text"
                bind:value={input}
                placeholder="New owner's user id"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
            />
        </div>
        {#if error}<p class="note invalid-note">{error}</p>{/if}
        <p class="note">
            Telegram only lets bots find people by numeric id — a @username will
            not work. Ask them to open this bot and tap Settings; the page shows
            them their id.
        </p>

        <div class="actions-stack">
            <button
                type="button"
                class="btn danger"
                disabled={!input.trim() || busy}
                onclick={handOver}
            >
                {busy ? "Handing over…" : "Hand over"}
            </button>
        </div>
        <p class="note">
            You lose access the moment this goes through, and only the new owner can
            hand it back.
        </p>
    {/if}
</Page>

<style>
/* slide clips the wrapper, so the first child's margin cannot collapse
   through it: the wrapper owns that gap instead. */
.reveal {
    margin-top: 24px;
}

.reveal > :first-child {
    margin-top: 0;
}
</style>
