import { type BotContext, miniAppUrl, newBotLink } from "../bot";
import { ownership } from "./owner_only";

const LINKS =
    '<a href="https://t.me/vipercommunity">Support</a> · ' +
    '<a href="https://github.com/viperadnan-git/telegram-forwarder-bot">Source</a> · ' +
    '<a href="https://github.com/viperadnan-git/telegram-forwarder-bot/issues">Report a problem</a>';

export default async function start_handler(ctx: BotContext) {
    const { isOwner, unclaimed } = await ownership(ctx);

    const settings = miniAppUrl(ctx.me.id);
    const help = miniAppUrl(ctx.me.id, "help");
    const clone =
        !isOwner && !unclaimed ? miniAppUrl(ctx.me.id, "clone") : undefined;
    // Not offered while unclaimed: the bot in front of them is free to take.
    const newBot = !isOwner && !unclaimed ? newBotLink(ctx.me) : undefined;

    // Everything that sets up forwarding is owner-only, so pointing a stranger
    // at /set only earns them a refusal.
    let body = "I copy new messages from one chat into another.\n\n";
    if (isOwner) {
        body += "Send /set to pick the two chats.";
    } else if (unclaimed) {
        body += "Nobody owns me yet. Send /set_owner to claim me.";
    } else if (newBot) {
        body +=
            "This one belongs to someone else. Tap below and Telegram makes you " +
            "your own — no token, nothing to set up.";
    } else {
        body +=
            "This one belongs to someone else. Set up your own with the button " +
            "below — you will need a token from @BotFather.";
    }

    const buttons = [
        ...(settings && isOwner
            ? [[{ text: "Settings", web_app: { url: settings } }]]
            : []),
        ...(newBot ? [[{ text: "Create your own bot", url: newBot }]] : []),
        ...(clone
            ? [
                  [
                      {
                          text: newBot
                              ? "I already have a bot"
                              : "Create your own bot",
                          web_app: { url: clone }
                      }
                  ]
              ]
            : []),
        ...(help ? [[{ text: "How it works", web_app: { url: help } }]] : [])
    ];

    await ctx.reply(`${body}\n\n${LINKS}`, {
        link_preview_options: { is_disabled: true },
        reply_markup: { inline_keyboard: buttons }
    });
}
