import TelegramBot, { InlineKeyboardMarkup, Message, PhotoSize, Video, Document, User, FileBase } from "node-telegram-bot-api";
import config from "./config.js";

enum ParseMode {
    Markdown = "Markdown",
    HTML = "HTML"
}


class TgBot  {
    public bot: TelegramBot 
    constructor() {
        const token: string = config.BOT_TOKEN;
        this.bot = new TelegramBot(token, { polling: true });
    }

    async sendMessage(
        chatId: number, 
        text: string, 
        keyboard?: InlineKeyboardMarkup, 
        parseMode: ParseMode = ParseMode.Markdown, 
        replyToMessageId?: number, 
        disableNotification: boolean = false
    ) {
        this.bot.sendMessage(
            chatId, 
            text,
            {
                parse_mode: parseMode,
                reply_markup: keyboard,
                reply_to_message_id: replyToMessageId,
                disable_notification: disableNotification
            }
        )
    }

    async sendAttachment<T extends FileBase>(
        chatId: number, 
        caption: string,
        attachment: T, 
        keyboard?: InlineKeyboardMarkup, 
        parseMode: ParseMode = ParseMode.Markdown, 
        replyToMessageId?: number, 
        disableNotification: boolean = false
    ) {
        let func = undefined;

        if (this.isPhoto(attachment)) {
            func = this.bot.sendPhoto
        } else if (this.isVideo(attachment)) {
            func = this.bot.sendVideo
        } else if (this.isDocument(attachment)) {
            func = this.bot.sendDocument
        }

        if (typeof func === 'undefined') {
            // TODO handle error
            console.log(`Error at sendAttachment: bot function is undefined`)
            return
        }

        await func(
            chatId,
            attachment.file_id,
            {
                caption: caption,
                parse_mode: parseMode,
                disable_notification: disableNotification,
                reply_markup: keyboard
            }
        )
    }

    private isPhoto(doc: FileBase): doc is PhotoSize {
        return ('width' in doc && 'height' in doc) && !('duration' in doc)
    }

    private isVideo(doc: FileBase): doc is Video {
        return ('width' in doc && 'height' in doc && 'duration' in doc)
    }

    private isDocument(doc: FileBase): doc is Document {
        return 'file_name' in doc || 'thumb' in doc
    }
}

const tgBot = new TgBot()

export default tgBot

export {
    ParseMode
}