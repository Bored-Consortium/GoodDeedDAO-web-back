import bot, { ParseMode } from './botDobra.js'
import dobroDb from './db.js'
import config from "./config.js";
import { User } from './models/user.js'
import { InlineKeyboardMarkup, Message, PhotoSize, Video, Document } from 'node-telegram-bot-api';


export function cmd_handler_start(chatId: number, username: string | undefined) {
    dobroDb.select_row_from_table('USERS', 'id_user', chatId, (row: any) => {
        let answer: string;
        if (row) {
            answer = `С возвращением, ${row.user_name}!`;
        } else {
            const table = 'USERS';
            const fields = `id_user,'user_name','karma','deeds','validations'`;
            const values = `${chatId},'${username}',${config.START_KARMA},0,0`;

            dobroDb.insert_data(table, fields, values, () => {});
            answer = `🤖 Привет! Я, бот Хранитель Добра\n\n` +
                `🌍 Добро пожаловать в Зов Добра!\n` +
                `🙏 Здесь мы меняем мир к лучшему\n\n` +
                `💫 Держи +${config.START_KARMA} Karma за регистрацию!\n\n` +
                `⬇️ Выбери дальнейшее действие ⬇️`;
        }

        const keyboard: InlineKeyboardMarkup = {
            inline_keyboard: [
                [
                    {text: 'О боте'},
                    {text: 'Мой аватар'},
                    {text: 'Добавить доброе дело'}
                ]
            ]
        }
        bot.sendMessage(chatId, answer, keyboard).then();
    });
}

export function cmd_handler_info(chatId: number) {
    const answer = `Я - бот Хранитель Зова Добра. Помогаю людям делать этот Мир добрее!
                    \n Подробное описание: https://telegra.ph/Pravila-blokchejn-agregatora-Dobryh-del-Zov-Dobra-12-05`;
    
        const keyboard: InlineKeyboardMarkup = { 
            inline_keyboard: [
                [
                    {text: 'О боте'},
                    {text: 'Мой Аватар'},
                    {text: 'Добавить доброе дело'}
                ]
            ]
        }
        bot.sendMessage(chatId, answer, keyboard).then();
}

export function cmd_handler_user_info(chatId: number) {
    dobroDb.select_row_from_table('USERS', 'id_user', chatId, (row: any) => {
        const answer =
            `Твоя Karma: ${row?.karma} \nДобрые дела: ${row?.deeds} \nГолосования: ${row?.validations}`;

        const keyboard: InlineKeyboardMarkup = { 
            inline_keyboard: [
                [
                    {text: 'О боте'},
                    {text: 'Мой Аватар'},
                    {text: 'Добавить доброе дело'}
                ]
            ]
        }

        bot.sendMessage(chatId, answer, keyboard).then();
    });
}

export function cmd_handler_add_deed(chatId: number) {
    const answer = `Выбери тип доброго дела`;

    const keyboard: InlineKeyboardMarkup = { 
        inline_keyboard: [
            [
                {text: 'Назад'},
                {text: 'Фото'},
                {text: 'Видео'},
                {text: 'Файл'}
            ]
        ]
    }

    bot.sendMessage(chatId, answer, keyboard).then();
}

export function cmd_handler_back(chatId: number) {
    const answer = `Вы перешли в основное меню`;

    const keyboard: InlineKeyboardMarkup = { 
        inline_keyboard: [
            [
                {text: 'О боте'},
                {text: 'Мой Аватар'},
                {text: 'Добавить доброе дело'}
            ]
        ]
    }

    bot.sendMessage(chatId, answer, keyboard).then();
}

export function cmd_handler_add_photo(chatId: number) {
    const answer = `Пришли мне фотографию твоего доброго дела`;
    bot.sendMessage(chatId, answer).then();
}

export function cmd_handler_add_video(chatId: number) {
    const answer = `Пришли мне видео твоего доброго дела`;
    bot.sendMessage(chatId, answer).then();
}

export function cmd_handler_add_file(chatId: number) {
    const answer = `Пришли мне файл с описанием твоего доброго дела`;
    bot.sendMessage(chatId, answer).then();
}

export async function cmd_handler_add_karma(from_user: User, descr: string, msg_id: number, reply_to_msg: Message | undefined) {
    if (!reply_to_msg) {
        const answer = `Вы не выбрали сообщение. Ответьте на сообщение пользователя командой "/addkarma <i>За то, что..</i>", чтобы инициировать голосование о начислении кармы.`;

        await bot.sendMessage(config.GROUP_ID, answer, undefined, ParseMode.HTML, msg_id, true).then();

    } else {
        const answer = `Пользователь @${from_user.username} инициировал голосование о начислении ${config.KARMA_BY_USER_VOTING} Karma @${reply_to_msg.from?.username}.`
            + `\n\nОпиcание:\n`
            + `<i>${descr}</i>`;

        const value = `'${reply_to_msg.message_id}'`;
        dobroDb.select_row_from_table('DEEDS', 'id_deed', value, (row: any) => {
            if (!row) {
                const text = `sample`;
                let table = 'DEEDS';
                let fields = `id_deed,upvote,downvote,is_validated,description,type`;
                let values = `'${reply_to_msg.message_id}',0,0,0,'${text}',4`;

                dobroDb.insert_data(table, fields, values, (err: Error) => {
                    console.log(err);
                });

                table = `DEED_BY_USER`;
                fields = `id_user,id_deed,id_msg`;
                values = `${reply_to_msg.from?.id},'${reply_to_msg.message_id}',0`;
                dobroDb.insert_data(table, fields, values, (err: Error) => {
                    console.log(err);
                });
            }
        });

        const keyboard: InlineKeyboardMarkup = {
            inline_keyboard: [
                [
                    {text: 'Заслужил!', callback_data: `yes`},
                    {text: 'Пока рано', callback_data: `no`}
                ]
            ]
        }

        await bot.sendMessage(config.GROUP_ID, answer, keyboard, ParseMode.HTML, reply_to_msg.message_id, true).then();
    }
}

export async function handler_photo_received(chatId: number, username: string | undefined, photo: PhotoSize, caption: string) {
    console.log(`handler_photo_received called by ${username} from chat ${chatId} with caption "${caption}"`)
    const answer = `Пользователь @${username} прислал новое доброе дело! #БытьДобру\n` +
    `\nОпиcание:\n` +
    `<i>${caption}</i>\n`;

    const value = `'${photo.file_unique_id}'`;
    dobroDb.select_row_from_table('DEEDS', 'id_deed', value, (row: any) => {
        if (!row) {
            const text = `sample`;
            let table = 'DEEDS';
            let fields = `id_deed,upvote,downvote,is_validated,description,type`;
            let values = `'${photo.file_unique_id}',0,0,0,'${text}',1`;

            dobroDb.insert_data(table, fields, values, (err: Error) => {
                console.log(err);
            });

            table = `DEED_BY_USER`;
            fields = `id_user,id_deed,id_msg`;
            values = `${chatId},'${photo.file_unique_id}',0`;
            dobroDb.insert_data(table, fields, values, (err: Error) => {
                console.log(err);
            });
        }
    });

    const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
            [
                {text: 'Дело доброе', callback_data: `yes`},
                {text: 'Не очень доброе', callback_data: `no`}
            ]
        ]
    }

    console.log(`send photo to group ${config.GROUP_ID}`)
    await bot.sendAttachment(config.GROUP_ID, answer, photo, keyboard, ParseMode.HTML, undefined, true).then();
}

export async function handler_video_received(chatId: number, username: string, video: Video, caption: string) {
    console.log(`handler_video_received called by ${username} from chat ${chatId} with caption "${caption}"`)
    const answer = `Пользователь @${username} прислал новое доброе дело! #БытьДобру\n` +
        `\nОпиcание:\n` +
        `<i>${caption}</i>\n`;

    // add deed to
    const value = `'${video.file_unique_id}'`;
    console.log(`received video with file_unique_id ${video.file_unique_id}`)
    dobroDb.select_row_from_table('DEEDS', 'id_deed', value, (row: any) => {
        if (!row) {
            const text = `sample`;
            let table = 'DEEDS';
            let fields = `id_deed,upvote,downvote,is_validated,description,type`;
            let values = `${value},0,0,0,'${text}',2`;

            dobroDb.insert_data(table, fields, values, (err: Error) => {
                console.log(err);
            });

            // Добавление доброго дела в табличку DEED_BY_USER
            table = `DEED_BY_USER`;
            fields = `id_user,id_deed,id_msg`;
            values = `${chatId},'${video.file_unique_id}',0`;
            dobroDb.insert_data(table, fields, values, (err: Error) => {
                console.log(err);
            });
        }
    });

    const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
            [
                {text: 'Дело доброе', callback_data: `yes`},
                {text: 'Не очень доброе', callback_data: `no`}
            ]
        ]
    }

    console.log(`send video to group ${config.GROUP_ID}`)
    await bot.sendAttachment(config.GROUP_ID, answer, video, keyboard, ParseMode.HTML, undefined, true).then();
}

export async function handler_file_received(chatId: number, username: string, document: Document, caption: string) {
    console.log(`handler_file_received called by ${username} from chat ${chatId} with caption "${caption}"`)
    const answer = `Пользователь @${username} прислал новое доброе дело! #БытьДобру\n` +
        `\nОпиcание:\n` +
        `<i>${caption}</i>\n`;

    // add deed to
    const value = `'${document.file_unique_id}'`;
    console.log(`received file with file_unique_id ${document.file_unique_id}`)
    dobroDb.select_row_from_table('DEEDS', 'id_deed', value, (row: any) => {
        if (!row) {
            const text = `sample`;
            let table = 'DEEDS';
            let fields = `id_deed,upvote,downvote,is_validated,description,type`;
            let values = `${value},0,0,0,'${text}',3`;

            dobroDb.insert_data(table, fields, values, (err: Error) => {
                console.log(err);
            });

            // Добавление доброго дела в табличку DEED_BY_USER
            table = `DEED_BY_USER`;
            fields = `id_user,id_deed,id_msg`;
            values = `${chatId},'${document.file_unique_id}',0`;
            dobroDb.insert_data(table, fields, values, (err: Error) => {
                console.log(err);
            });
        }
    });

    const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
            [
                {text: 'Дело доброе', callback_data: `yes`},
                {text: 'Не очень доброе', callback_data: `no`}
            ]
        ]
    }

    console.log(`send file to group ${config.GROUP_ID}`)
    await bot.sendAttachment(config.GROUP_ID, answer, document, keyboard, ParseMode.HTML, undefined, true).then();
}

export async function handler_tag_received(msg: Message, karma: number, answer: string) {
    if (typeof msg.from !== 'undefined') {
        dobroDb.update_karma(msg.from.id, karma);
        bot.sendMessage(config.GROUP_ID, answer, undefined, ParseMode.Markdown, msg.message_id).then();
    } else {
        // TODO handle error
    }
    
}

export async function handler_unknown_message(chat_id: number) {
    const answer = `Я не понимаю тебя, человек 😢`;
    bot.sendMessage(chat_id, answer).then();
}