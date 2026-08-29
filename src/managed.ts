import { Bot } from "grammy";
import { dropBot, getBotById } from "./bot";
import { adoptBot } from "./clone";
import logger from "./lib/logger";
import db from "./store";

/** A managed bot's token is the manager's to read and replace, never its own. */
export type ManagedState = { managed: boolean };

const OFFLINE =
    "The bot that created this one is not running here right now. Send it a message and try again.";

/** Undefined unless this bot was created by a manager running in this process. */
async function managerApi(botId: number) {
    const managerId = await db.getManager(botId);
    return managerId ? getBotById(managerId)?.api : undefined;
}

export async function managedState(botId: number): Promise<ManagedState> {
    try {
        return { managed: !!(await managerApi(botId)) };
    } catch (error: any) {
        logger.warn(`Managed state for ${botId} failed: ${error.message}`);
        return { managed: false };
    }
}

export type ManagedPatch = {
    /** Revokes the current token and starts the bot again on the new one. */
    rotate?: boolean;
    /**
     * Deletes everything the bot forwards here and stops it. The bot itself
     * lives on: only its owner can delete it, through @BotFather.
     */
    remove?: boolean;
};

export async function applyManaged(
    botId: number,
    ownerId: number,
    patch: ManagedPatch
): Promise<{ ok: true; state: ManagedState } | { ok: false; error: string }> {
    const api = await managerApi(botId);
    if (!api) return { ok: false, error: OFFLINE };

    try {
        if (patch.remove) {
            const token = await api.getManagedBotToken(botId);
            await new Bot(token).api.deleteWebhook();
            dropBot(botId);
            await db.clearRoutes(botId);
            return { ok: true, state: { managed: true } };
        }

        if (patch.rotate) {
            // The old token dies here, so the bot needs the new one to live.
            const token = await api.replaceManagedBotToken(botId);
            // The new token exists nowhere else, so retry once before failing.
            let started = await adoptBot(token, botId, ownerId);
            if (!started.ok) started = await adoptBot(token, botId, ownerId);
            if (!started.ok) {
                logger.error(
                    `Bot ${botId} is not running after rotating: ${started.error}`
                );
                return {
                    ok: false,
                    error: `${started.error} The bot is stopped until this succeeds — tap Replace token again.`
                };
            }
        }

        return { ok: true, state: await managedState(botId) };
    } catch (error: any) {
        const why = error.description ?? error.message ?? "unknown error";
        logger.warn(`Managed bot ${botId} update failed: ${why}`);
        return { ok: false, error: why };
    }
}
