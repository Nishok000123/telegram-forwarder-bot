import { addColors, createLogger, format, transports } from "winston";

addColors({
    error: "red",
    warn: "yellow",
    info: "white",
    debug: "gray"
});

// A webhook path is "/bot<token>", and Telegram API URLs carry one too. The
// bot id is kept: it names the bot and is not secret.
const BOT_TOKEN = /(\d{6,12}):[A-Za-z0-9_-]{30,}/g;

const redact = format((info) => {
    if (typeof info.message === "string") {
        info.message = info.message.replace(BOT_TOKEN, "$1:***");
    }
    return info;
});

const logger = createLogger({
    // Parenthesised: `a || b ? x : y` parses as `(a || b) ? x : y`, which made
    // any truthy LOG_LEVEL force "info".
    level:
        process.env.LOG_LEVEL ||
        (process.env.NODE_ENV === "production" ? "info" : "debug"),
    format: format.combine(
        redact(),
        format.timestamp({
            format: "DD-MM-YYYY HH:mm:ss"
        }),
        format.printf(
            (info) =>
                `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`
        )
    ),
    transports: [
        new transports.Console({
            format: format.combine(format.colorize({ all: true }))
        }),
        new transports.File({ filename: "log.txt" })
    ]
});

export default logger;
