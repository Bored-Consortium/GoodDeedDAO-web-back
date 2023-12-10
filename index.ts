import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import express from 'express';
import cors from 'cors';

import fs from 'fs'
import config from './sources/config.js'
import dobroDb from './sources/db.js';
import { User, UserRole } from './sources/models/user.js'
import { Deed } from './sources/models/deed.js';

import {
    cmd_handler_start,
    cmd_handler_info,
    cmd_handler_user_info,
    cmd_handler_add_deed,
    cmd_handler_back,
    cmd_handler_add_photo,
    cmd_handler_add_video,
    cmd_handler_add_file,
    cmd_handler_add_karma,
    handler_photo_received,
    handler_video_received,
    handler_file_received,
    handler_tag_received,
    handler_unknown_message
} from './sources/commandHandlers.js'

if (!fs.existsSync("./data_folder")) {
    console.log(`Creating ./data_folder`)
    fs.mkdirSync("./data_folder");
}

const dobro_tag = `#бытьдобру`;

const groupId: number = config.GROUP_ID;
const token: string = config.BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot: TelegramBot = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(cors())

bot.on('message', async (msg: TelegramBot.Message) => {
    console.log(`message received: ${msg.photo}, ${msg.video}, ${msg.document}, ${msg.animation}`)
})

// bot.on('inline_query', async (inlineQuery) => {
//     console.log(`inline_query received: ${msg.photo}, ${msg.video}, ${msg.document}, ${msg.animation}`)
//     const result = {}
//     await bot.answerInlineQuery(inlineQuery.id, "hi man", {})
// })

bot.on('text', async (msg) => {
    const chat_id: number = msg.chat.id;
    const text: string = msg.text ? msg.text : "";

    if (typeof msg.from === 'undefined') {
        return
    }

    const from_user = {
        id: msg.from.id,
        username: msg.from.username,
    }

    if (!chat_id) {
        console.log('chat_id in msg is null');
        return;
    }

    console.log(`user ${from_user.username} send text: ${text}`)

    if (chat_id === groupId) {
        const addKarmaCommand = text.toLowerCase()
        if (addKarmaCommand.includes("/addkarma")) {
            const this_msg_id = msg.message_id
            const descr = text.slice(10,);
            console.log(`deed description:`, descr)
            await cmd_handler_add_karma(from_user, descr, this_msg_id, msg.reply_to_message);
        }

        if (text?.toLowerCase().includes(dobro_tag)) {
            const karma = config.KARMA_FOR_TAG;
            const answer = `@${from_user.username}, спасибо за твое пожелание! Держи +${karma} Karma`;
            await handler_tag_received(msg, karma, answer);
        }

    } else if (text === '/start') {
        cmd_handler_start(chat_id, from_user.username);
    } else if (text === '/help' || text === 'О боте') {
        cmd_handler_info(chat_id);
    } else if (text === '/userinfo' || text === 'Мой Аватар') {
        cmd_handler_user_info(chat_id);
    } else if (text === '/adddeed' || text === 'Добавить доброе дело') {
        cmd_handler_add_deed(chat_id);
    } else if (text === '/back' || text === 'Назад') {
        cmd_handler_back(chat_id);
    } else if (text === '/addphoto' || text === 'Фото') {
        cmd_handler_add_photo(chat_id);
    } else if (text === '/addvideo' || text === 'Видео') {
        cmd_handler_add_video(chat_id);
    } else if (text === '/addfile' || text === 'Файл') {
        cmd_handler_add_file(chat_id);
    } else {
        await handler_unknown_message(chat_id);
    }
});

bot.on('photo', async (msg) => {
    const chat_id: number = msg.chat.id;
    const username: string | undefined = msg.from?.username;

    if (!chat_id) {
        console.log('chat_id in msg is null');
        return;
    }

    console.log(`user ${username} send photo`)

    let photo: TelegramBot.PhotoSize | undefined = undefined
    let caption: string | undefined = undefined 
    
    if (typeof msg.photo === 'undefined' || typeof username === 'undefined' || typeof msg.caption === 'undefined') {
        // TODO handle it
        return
    }

    photo = msg.photo[msg.photo.length - 1];
    caption = msg.caption;
    console.log(`in message: photo: ${photo.file_id}, caption: "${caption}"`)

    if (chat_id === groupId) {
        console.log(`message from group ${chat_id}`)
        if (caption.toLowerCase().includes(dobro_tag)) {
            const karma = config.KARMA_FOR_TAG;
            const answer = `@${username}, спасибо за твое прекрасное фото! Держи +${karma} Karma`;
            await handler_tag_received(msg, karma, answer);
        }
        return;
    }

    await handler_photo_received(chat_id, username, photo, caption);
});

bot.on('video', async (msg) => {
    const chat_id: number = msg.chat.id;
    const username: string | undefined = msg.from?.username;

    if (!chat_id) {
        console.log('chat_id in msg is null');
        return;
    }

    console.log(`user ${username} send video`)

    let video:              TelegramBot.Video | undefined   = undefined
    let caption:            string | undefined              = undefined

    if (typeof msg.video === 'undefined' || typeof username === 'undefined' || typeof msg.caption === 'undefined') {
        // TODO handle it
        return
    }
    video = msg.video;
    caption = msg.caption;
    console.log(`in message: video: ${video.file_id}, caption: "${caption}"`)

    if (chat_id === groupId) {
        console.log(`message from group ${chat_id}`)
        if (caption?.toLowerCase().includes(dobro_tag)) {
            const karma = config.KARMA_FOR_TAG;
            const answer = `@${username}, спасибо за это прекрасное видео! Держи +${karma} Karma`;
            await handler_tag_received(msg, karma, answer);
        }
        return;
    }

    await handler_video_received(chat_id, username, video, caption);
});

bot.on('document', async (msg: TelegramBot.Message) => {
    const chat_id = msg.chat.id;
    const username: string | undefined = msg.from?.username;

    if (!chat_id) {
        console.log('chat_id in msg is null');
        return;
    }

    console.log(`user ${username} send document`)

    let document:           TelegramBot.Document | undefined   = undefined
    let caption:            string | undefined                 = undefined

    if (typeof msg.document === 'undefined' || typeof username === 'undefined' || typeof msg.caption === 'undefined') {
        // TODO handle it
        return
    }

    document = msg.document;
    caption = msg.caption;
    console.log(`in message: file: ${document.file_id}, caption: "${caption}"`)

    if (chat_id === groupId) {
        console.log(`message from group ${chat_id}`)
        if (caption?.toLowerCase().includes(dobro_tag)) {
            const karma = config.KARMA_FOR_TAG;
            const answer = `@${username}, спасибо за этот прекрасный файл! Держи +${karma} Karma`;
            await handler_tag_received(msg, karma, answer);
        }
        return;
    }

    await handler_file_received(chat_id, username, document, caption);
});

bot.on('callback_query', function onCallbackQuery(callbackData) {
    const sender: User = {
        id: callbackData.from.id,
        username: callbackData.from.username,
        role: UserRole.validator,
    };

    let msg: Message | undefined = typeof callbackData.message !== 'undefined' ? callbackData.message : undefined
    
    if (typeof msg === 'undefined') {
        console.log(`⛔️  Message is undefined in callback_query`)
        // TODO handle error
        return
    }
    const msgId: number = msg.message_id

    const caption = msg.text ? msg.text : msg.caption
    if (typeof caption === 'undefined') {
        console.log(`⛔️  Caption is undefined in callback_query`)
        // TODO handle error
        return
    }

    let text_type = `caption`
    let file_unique_id: string;

    if (msg?.photo) {
        file_unique_id = msg.photo[msg.photo.length - 1].file_unique_id;
    } else if (msg?.video) {
        file_unique_id = msg.video.file_unique_id;
    } else if (msg?.document) {
        file_unique_id = msg.document.file_unique_id;
    } else {
        file_unique_id = String(msg?.reply_to_message?.message_id);
        text_type = 'text';
    }

    console.log(`opts: ${caption}, ${msg.chat.id}, ${msg.message_id}`)
    is_voting_finished(file_unique_id, (
        is_voting_finished: boolean, 
        upvotes: number, 
        downvotes: number,
    ) => {
        const deed: Deed = {
            id: file_unique_id,
            upvotes: upvotes,
            downvotes: downvotes,
            isValidated: is_voting_finished,
        };
        console.log(`deed: ${deed.id}, ${deed.upvotes}, ${deed.downvotes}, ${deed.isValidated}`)

        if (deed.isValidated) {
            bot.answerCallbackQuery(callbackData.id, {
                text: `Голосование по этому делу уже завершилось`,
            }).then();
            return;
        }

        get_user_by_deed(deed.id, (
            id_user_creator: number, 
            username_creator: string
        ) => {
            const creator: User = {
                id: id_user_creator,
                username: username_creator,
            };

            if (creator.id === sender.id) {
                bot.answerCallbackQuery(callbackData.id, {
                    text: `Это Ваше дело, вы не можете голосовать`,
                }).then();
                return;
            }

            set_new_vote(sender, callbackData, deed.id, (did_user_vote: boolean) => {
                if (!did_user_vote) {
                    handle_new_vote(deed, caption, msgId, text_type, callbackData, creator, sender);
                } else {
                    bot.answerCallbackQuery(callbackData.id, {
                        text: `Вы уже голосовали`,
                    }).then();
                }
            });
        });
    });
});


function is_voting_finished(file_unique_id: string, callback: any) {
    dobroDb.select_row_from_table('DEEDS', 'id_deed', `'${file_unique_id}'`, (row: any) => {
        if (row) {
            if (row?.is_validated === 1 || row?.is_validated === -1) {
                callback(true, row?.upvote, row?.downvote);
            } else {
                callback(false, row?.upvote, row?.downvote);
            }
        }
    });
}

function set_voting_finished(id_photo: string, result: any, username: string | undefined, karma: number) {
    dobroDb.update_voting_result(id_photo, result);

    let res;
    if (result.textType === 'caption') {
        if (result === 1) {
            res = `Доброе дело принято и будет выпущено в виде NFT в Галерее Добра!`;
        } else if (result === -1) {
            res = `Доброе дело не принято.`;
        }

        const cap = result.caption +
            `\n\n<b>Голосование закончено!</b>` +
            `\n<b>Результат</b>: ${res}` +
            `\n@${username} получил ${karma} Karma!`;

        bot.editMessageCaption(cap, {
            parse_mode: `HTML`,
            chat_id: groupId,
            message_id: result.messageId,
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: 'Голосование закончено', callback_data: `finished`},
                    ]
                ]
            }
        }).then();
    } else if (result.textType === 'text') {
        const cap = result.caption +
            `\n\n<b>Голосование закончено!</b>` +
            `\n@${username} получил ${karma} Karma!`;

        bot.editMessageText(cap, {
            parse_mode: `HTML`,
            chat_id: groupId,
            message_id: result.messageId,
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: 'Голосование закончено', callback_data: `finished`},
                    ]
                ]
            }
        }).then();
    }

    const voter_karma = Math.ceil(karma * config.KARMA_KOEF_FOR_VOTERS);
    add_karma_to_voters(id_photo, result, voter_karma);
}

function add_karma_to_voters(id_photo: string, result: number, voter_karma: number) { // TODO replace result with enum type
    let res_msg: string = result === 1 ? `принято` : `не принято`

    // Select all voters + their vote
    dobroDb.select_data_from_table(`VOTES`,`id_deed`,`'${id_photo}'`,(rows: any) => {
        const message = `Доброе дело, за которое вы голосовали, ${res_msg}. ` +
                        `Вам начислено ${voter_karma} Karma.`;
        rows.forEach((row: any) => {
            // Filter voters by their vote
            if (row.vote === result) {
                dobroDb.update_karma(row.id_user, voter_karma);
                bot.sendMessage(row.id_user, message, {
                    parse_mode: `Markdown`,
                }).then();
            }
            dobroDb.update_add_validations(row.id_user);
        });

        // TODO Send message to chat
    });
}

function set_new_vote(sender: User, callbackData: CallbackQuery, id_deed: string, callback: any) {
    let vote;
    if (callbackData.data === `yes`) {
        vote = 1;
    } else if (callbackData.data === `no`) {
        vote = -1;
    }

    let status;
    if      (sender.role === UserRole.creator)   {  status = 1; }
    else if (sender.role === UserRole.validator) {  status = 2; }

    const fields = `id_user,id_deed,vote,status`;
    const values = `${sender.id},'${id_deed}',${vote},${status}`;
    dobroDb.insert_data(`VOTES`, fields, values, (err: Error) => {
        const error_msg = `SQLITE_CONSTRAINT: UNIQUE constraint failed: VOTES.id_user, VOTES.id_deed`;
        if (err) {
            callback(err?.message === error_msg);
        } else {
            callback(false);
        }

    });
}

function get_user_by_deed(photo_unique_id: string, callback: any){
    dobroDb.select_row_from_table('DEED_BY_USER', 'id_deed', `'${photo_unique_id}'`, (row: any) => {
        dobroDb.select_row_from_table('USERS', 'id_user', `${row.id_user}`, (user_row: any) => {
            callback(row.id_user, user_row.user_name);
        });
    });
}

function handle_new_vote(deed: Deed, caption: string, messageId: number, textType: string, callbackData: CallbackQuery, creator: User, sender: User) {
    const new_line = deed.downvotes === 0 && deed.upvotes === 0 ? `\n` : ``;

    const karma = callbackData.data === 'yes' ? config.KARMA_FOR_GOOD_DEED : config.KARMA_FOR_GOOD_DEED_FAILED
    const vote = callbackData.data === 'yes' ? "за" : "против"
    caption = caption + `${new_line}\n@${sender.username} проголосовал ${vote}`;

    let res = {
        karma: karma,
        result: callbackData.data === 'yes' 
            ? 1 
            : -1,
        answer: callbackData.data === 'yes' 
            ? `Поздравляю, ты сделал Доброе Дело! Я начислил тебе ${karma} _Karma_` 
            : `Сообщество не посчитало это дело достаточно добрым. Я начислил тебе утешительные ${karma} _Karma_!`,
        callback_answer: callbackData.data === 'yes' 
            ? `Голос "за" дело учтён!` 
            : `Голос "против" учтён!`,
        caption: caption,
        textType: textType,
        messageId: messageId,
    }


    if (callbackData.data === 'yes') {
        dobroDb.update_votes(deed.id, `upvote`); // TODO replace string with enum type
    } else if (callbackData.data === `no`) {
        dobroDb.update_votes(deed.id, `downvote`);
    } else {
        console.log('Something go wrong');
    }

    if (textType === 'caption') {
        bot.editMessageCaption(caption, {
            chat_id: groupId,
            //parse_mode: `Markdown`,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: 'Дело доброе', callback_data: `yes`},
                        {text: 'Не очень доброе', callback_data: `no`}
                    ]
                ]
            }
        }).then();
    } else if (textType === 'text') {
        if (callbackData.data  === 'yes') {
            res.karma =  config.KARMA_BY_USER_VOTING;
            res.answer = `Поздравляю, ты сделал Доброе Дело! Я начислил тебе ${res.karma} _Karma_`;
        } else if (callbackData.data  === 'no') {
            res.karma = config.KARMA_BY_USER_VOTING_FAILED;
            res.answer = `Было запущено голосование, но сообщество не посчитало это дело достаточно добрым. Начислил тебе утешительные ${res.karma} Karma`;
        }
        bot.editMessageText(caption, {
            chat_id: groupId,
            //parse_mode: `Markdown`,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: 'Заслужил!', callback_data: `yes`},
                        {text: 'Пока рано', callback_data: `no`}
                    ]
                ]
            }
        }).then();
    }

    if (deed.upvotes + 1 === config.VOTES_FOR_APPROVE || deed.downvotes + 1 === config.VOTES_FOR_APPROVE) {
        set_voting_finished(deed.id, res, creator.username, res.karma);
        dobroDb.update_karma(creator.id, res.karma);
        dobroDb.update_add_deed(creator.id);
        bot.sendMessage(creator.id, res.answer, {
            parse_mode: `Markdown`,
        }).then();

    } else {
        bot.answerCallbackQuery(callbackData.id, {
            text: res.callback_answer,
        }).then();
    }
}
