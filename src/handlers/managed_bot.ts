import type { BotContext } from "../bot";
import { adoptBot } from "../clone";
import logger from "../lib/logger";
import db from "../store";

/**
 * Creation, token rotation and owner change all arrive here, and end the same
 * way: point the current token at this instance and record who owns it.
 */
export default async function managed_bot_handler(ctx: BotContext) {
    const update = ctx.managedBot;
    if (!update) return;
    const { user, bot } = update;

    // `user` is always the creator, so a hand-over must survive a rotation.
    const owner = (await db.getOwner(bot.id)) ?? user.id;
    const isNew = owner === user.id;

    const token = await ctx.api.getManagedBotToken(bot.id);
    const result = await adoptBot(token, bot.id, owner, ctx.me.id);

    if (!result.ok) {
        logger.warn(`Managed bot ${bot.id} did not start: ${result.error}`);
        await ctx.api.sendMessage(
            owner,
            `@${bot.username} was created, but I could not start it: ${result.error}`
        );
        return;
    }

    // A rotation is not news; only tell someone the bot is theirs once.
    if (!isNew) return;

    logger.info(`Managed bot ${bot.id} (@${bot.username}) owned by ${user.id}`);
    await ctx.api.sendMessage(
        owner,
        `<b>@${bot.username}</b> is ready, and it is yours.\n\n` +
            "Open it and send /settings to choose what it forwards.",
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: `Open @${bot.username}`,
                            url: `https://t.me/${bot.username}`
                        }
                    ]
                ]
            }
        }
    );
}
