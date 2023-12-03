const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs')

const START_KARMA = Number(process.env.START_KARMA);
const VOTES_TO_APPROVE = Number(process.env.VOTES_FOR_APPROVE);
const KARMA_FOR_GOOD_DEED = Number(process.env.KARMA_FOR_GOOD_DEED);
const KARMA_FOR_GOOD_DEED_FAILED = Number(process.env.KARMA_FOR_GOOD_DEED_FAILED)
const KARMA_BY_USER_VOTING = Number(process.env.KARMA_BY_USER_VOTING)
const KARMA_BY_USER_VOTING_FAILED = Number(process.env.KARMA_BY_USER_VOTING_FAILED)
const KARMA_FOR_TAG = Number(process.env.KARMA_FOR_TAG)
const KARMA_KOEF_FOR_VOTERS = Number(process.env.KARMA_KOEF_FOR_VOTERS)

if (!fs.existsSync("./data_folder")) {
    console.log(`Creating ./data_folder`)
    fs.mkdirSync("./data_folder");
}

const db = new sqlite3.Database('./data_folder/gooddeeds.db',(err) => {
    if (err) {
        console.log('Could not connect to database', err)
    } else {
        console.log('Connected to database')
    }
});

create_tables();

const dobro_tag = `#бытьдобру`;

const groupId = Number(process.env.GROUP_ID);
const token = process.env.BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(cors())

bot.on('message', async (msg) => {
    console.log(`message received: ${msg.photo}, ${msg.video}, ${msg.document}, ${msg.animation}`)
})

bot.on('inline_query', async (inlineQuery) => {
    console.log(`inline_query received: ${msg.photo}, ${msg.video}, ${msg.document}, ${msg.animation}`)
    const result = {}
    await bot.answerInlineQuery(inlineQuery.id, "hi man", {})
})

bot.on('text', async (msg) => {
    const chat_id = msg.chat.id;
    const text = msg.text;
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
        if (text?.toLowerCase().includes("/addkarma")) {
            const this_msg_id = msg.message_id
            const descr = text.slice(10,);
            console.log(`deed description:`, descr)
            await cmd_handler_add_karma(from_user, descr, this_msg_id, msg.reply_to_message);
        }

        if (text?.toLowerCase().includes(dobro_tag)) {
            const karma = KARMA_FOR_TAG;
            const answer = `@${msg.from.username}, спасибо за твое пожелание! Держи +${karma} Karma`;
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
    const chat_id = msg.chat.id;
    const username = msg.from.username;

    if (!chat_id) {
        console.log('chat_id in msg is null');
        return;
    }

    console.log(`user ${username} send photo`)

    let photo, caption, is_tag_in_caption = false;
    if (msg.photo) {
        photo = msg.photo[msg.photo.length - 1];
        caption = msg.caption;
        is_tag_in_caption = caption?.toLowerCase().includes(dobro_tag);
        console.log(`in message: photo: ${photo.file_id}, caption: "${caption}", tag: ${is_tag_in_caption}`)
    }

    if (chat_id === groupId) {
        console.log(`message from group ${chat_id}`)
        if (caption?.toLowerCase().includes(dobro_tag) || is_tag_in_caption) {
            const karma = KARMA_FOR_TAG;
            const answer = `@${msg.from.username}, спасибо за твое прекрасное фото! Держи +${karma} Karma`;
            await handler_tag_received(msg, karma, answer);
        }
        return;
    }

    await handler_photo_received(chat_id, username, photo, caption);
});

bot.on('video', async (msg) => {
    const chat_id = msg.chat.id;
    const username = msg.from.username;

    if (!chat_id) {
        console.log('chat_id in msg is null');
        return;
    }

    console.log(`user ${username} send video`)

    let video, caption, is_tag_in_caption = false;
    if (msg.video) {
        video = msg.video;
        caption = msg.caption;
        is_tag_in_caption = caption?.toLowerCase().includes(dobro_tag);
        console.log(`in message: video: ${video.file_id}, caption: "${caption}", tag: ${is_tag_in_caption}`)
    }

    if (chat_id === groupId) {
        console.log(`message from group ${chat_id}`)
        if (caption?.toLowerCase().includes(dobro_tag) || is_tag_in_caption) {
            const karma = KARMA_FOR_TAG;
            const answer = `@${msg.from.username}, спасибо за это прекрасное видео! Держи +${karma} Karma`;
            await handler_tag_received(msg, karma, answer);
        }
        return;
    }

    await handler_video_received(chat_id, username, video, caption);
});

bot.on('document', async (msg) => {
    const chat_id = msg.chat.id;
    const username = msg.from.username;

    if (!chat_id) {
        console.log('chat_id in msg is null');
        return;
    }

    console.log(`user ${username} send document`)

    let document, caption, is_tag_in_caption = false;
    if (msg.document) {
        document = msg.document;
        caption = msg.caption;
        is_tag_in_caption = caption?.toLowerCase().includes(dobro_tag);
        console.log(`in message: file: ${document.file_id}, caption: "${caption}", tag: ${is_tag_in_caption}`)
    }

    if (chat_id === groupId) {
        console.log(`message from group ${chat_id}`)
        if (caption?.toLowerCase().includes(dobro_tag) || is_tag_in_caption) {
            const karma = KARMA_FOR_TAG;
            const answer = `@${msg.from.username}, спасибо за этот прекрасный файл! Держи +${karma} Karma`;
            await handler_tag_received(msg, karma, answer);
        }
        return;
    }

    await handler_file_received(chat_id, username, document, caption);
});

bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    const sender = {
        id: callbackQuery.from.id,
        username: callbackQuery.from.username,
        action: callbackQuery.data,
        callback_id: callbackQuery.id,
        role: 'validator',
    };
    const msg = callbackQuery.message;
    let opts = {
        caption: msg.text ? msg.text : msg.caption,
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        text_type: `caption`,
    };

    let file_unique_id;
    if (msg.photo) {
        file_unique_id = msg.photo[msg.photo.length - 1].file_unique_id;
    } else if (msg.video) {
        file_unique_id = msg.video.file_unique_id;
    } else if (msg.document) {
        file_unique_id = msg.document.file_unique_id;
    } else {
        file_unique_id = String(msg.reply_to_message.message_id);
        opts.text_type = 'text';
    }

    console.log(`opts: ${opts.caption}, ${opts.chat_id}, ${opts.message_id}, ${opts.text_type}`)
    is_voting_finished(file_unique_id, (is_voting_finished, upvotes, downvotes) => {
        const deed = {
            id: file_unique_id,
            upvotes: upvotes,
            downvotes: downvotes,
            finished: is_voting_finished,
        };
        console.log(`deed: ${deed.id}, ${deed.upvotes}, ${deed.downvotes}, ${deed.finished}`)
        if (deed.finished) {
            bot.answerCallbackQuery(callbackQuery.id, {
                text: `Голосование по этому делу уже завершилось`,
            }).then();
            return;
        }

        get_user_by_deed(deed.id, (id_user_creator, username_creator) => {
            const creator = {
                id: id_user_creator,
                username: username_creator,
            };

            if (creator.id === sender.id) {
                bot.answerCallbackQuery(sender.callback_id, {
                    text: `Это Ваше дело, вы не можете голосовать`,
                }).then();
                return;
            }

            // is_user_creator();
            set_new_vote(sender, deed.id, (did_user_vote) => {
                if (!did_user_vote) {
                    handle_new_vote(deed, opts, creator, sender);
                } else {
                    bot.answerCallbackQuery(sender.callback_id, {
                        text: `Вы уже голосовали`,
                    }).then();
                }
            });
        });
    });
});


function is_voting_finished(file_unique_id, callback) {
    select_row_from_table('DEEDS', 'id_deed', `'${file_unique_id}'`, (row) => {
        if (row) {
            if (row?.is_validated === 1 || row?.is_validated === -1) {
                callback(true, row?.upvote, row?.downvote);
            } else {
                callback(false, row?.upvote, row?.downvote);
            }
        }
    });
}


function set_voting_finished(id_photo, result, username, karma, opts) {
    update_voting_result(id_photo, result);

    let res;
    if (opts.text_type === 'caption') {
        if (result === 1) {
            res = `Доброе дело принято и будет выпущено в виде NFT в Галерее Добра!`;
        } else if (result === -1) {
            res = `Доброе дело не принято.`;
        }

        const cap = opts.caption +
            `\n\n<b>Голосование закончено!</b>` +
            `\n<b>Результат</b>: ${res}` +
            `\n@${username} получил ${karma} Karma!`;

        bot.editMessageCaption(cap, {
            parse_mode: `HTML`,
            chat_id: groupId,
            message_id: opts.message_id,
            reply_markup: {
                resize_keyboard: true,
                inline_keyboard: [
                    [
                        {text: 'Голосование закончено', callback_data: `finished`},
                    ]
                ]
            }
        }).then();
    } else if (opts.text_type === 'text') {
        const cap = opts.caption +
            `\n\n<b>Голосование закончено!</b>` +
            `\n@${username} получил ${karma} Karma!`;

        bot.editMessageText(cap, {
            parse_mode: `HTML`,
            chat_id: groupId,
            message_id: opts.message_id,
            reply_markup: {
                resize_keyboard: true,
                inline_keyboard: [
                    [
                        {text: 'Голосование закончено', callback_data: `finished`},
                    ]
                ]
            }
        }).then();
    }

    const voter_karma = Math.ceil(karma * KARMA_KOEF_FOR_VOTERS);
    add_karma_to_voters(id_photo, result, voter_karma);
}

function add_karma_to_voters(id_photo, result, voter_karma) {
    let res_msg;
    if (result === 1) {
        res_msg = `принято`;
    } else {
        res_msg = `не принято`;
    }

    // Select all voters + their vote
    select_data_from_table(`VOTES`,`id_deed`,`'${id_photo}'`,(rows) => {
        const message = `Доброе дело, за которое вы голосовали, ${res_msg}. ` +
                        `Вам начислено ${voter_karma} Karma.`;
        rows.forEach((row) => {
            // Filter voters by their vote
            if (row.vote === result) {
                update_karma(row.id_user, voter_karma);
                bot.sendMessage(row.id_user, message, {
                    parse_mode: `Markdown`,
                }).then();
            }
            update_add_validations(row.id_user);
        });

        // Send message to chat
    });



}

function set_new_vote(sender, id_deed, callback) {
    let vote;
    if (sender.action === `yes`) {
        vote = 1;
    } else if (sender.action === `no`) {
        vote = -1;
    }

    let status;
    if      (sender.role === `creator`)   {  status = 1; }
    else if (sender.role === `validator`) {  status = 2; }

    const fields = `id_user,id_deed,vote,status`;
    const values = `${sender.id},'${id_deed}',${vote},${status}`;
    insert_data(`VOTES`, fields, values, (error) => {
        const error_msg = `SQLITE_CONSTRAINT: UNIQUE constraint failed: VOTES.id_user, VOTES.id_deed`;
        if (error) {
            callback(error?.message === error_msg);
        } else {
            callback(false);
        }

    });
}

function get_user_by_deed(photo_unique_id, callback){
    select_row_from_table('DEED_BY_USER', 'id_deed', `'${photo_unique_id}'`, (row) => {
        select_row_from_table('USERS', 'id_user', `${row.id_user}`, (user_row) => {
            callback(row.id_user, user_row.user_name);
        });
    });
}

function handle_new_vote(deed, opts, creator, sender) {
    const new_line = deed.downvotes === 0 && deed.upvotes === 0 ? `\n` : ``;

    let res;
    if (sender.action === 'yes') {
        update_votes(deed.id, `upvote`);
        opts.caption = opts.caption + `${new_line}\n@${sender.username} проголосовал "за"`;
        const karma = KARMA_FOR_GOOD_DEED;
        res = {
            karma: karma,
            result: 1,
            answer: `Поздравляю, ты сделал Доброе Дело! Я начислил тебе ${karma} _Karma_`,
            callback_answer: `Голос "за" дело учтён!`,
        }
    } else if (sender.action === `no`) {
        update_votes(deed.id, `downvote`);
        opts.caption = opts.caption + `${new_line}\n@${sender.username} проголосовал "против"`;
        const karma = KARMA_FOR_GOOD_DEED_FAILED;
        res = {
            karma: karma,
            result: -1,
            answer: `Сообщество не посчитало это дело достаточно добрым. Я начислил тебе утешительные ${karma} _Karma_!`,
            callback_answer: `Голос "против" учтён!`,
        }
    } else {
        console.log('You hit');
    }

    if (opts.text_type === 'caption') {
        bot.editMessageCaption(opts.caption, {
            chat_id: groupId,
            //parse_mode: `Markdown`,
            message_id: opts.message_id,
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: 'Дело доброе', callback_data: `yes`},
                        {text: 'Не очень доброе', callback_data: `no`}
                    ]
                ]
            }
        }).then();
    } else if (opts.text_type === 'text') {
        if (sender.action  === 'yes') {
            res.karma =  KARMA_BY_USER_VOTING;
            res.answer = `Поздравляю, ты сделал Доброе Дело! Я начислил тебе ${res.karma} _Karma_`;
        } else if (sender.action  === 'no') {
            res.karma = KARMA_BY_USER_VOTING_FAILED;
            res.answer = `Было запущено голосование, но сообщество не посчитало это дело достаточно добрым. Начислил тебе утешительные ${res.karma} Karma`;
        }
        bot.editMessageText(opts.caption, {
            chat_id: groupId,
            //parse_mode: `Markdown`,
            message_id: opts.message_id,
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

    if (deed.upvotes + 1 === VOTES_TO_APPROVE || deed.downvotes + 1 === VOTES_TO_APPROVE) {
        set_voting_finished(deed.id, res.result, creator.username, res.karma, opts);
        update_karma(creator.id, res.karma);
        update_add_deed(creator.id);
        bot.sendMessage(creator.id, res.answer, {
            parse_mode: `Markdown`,
        }).then();

    } else {
        bot.answerCallbackQuery(sender.callback_id, {
            text: res.callback_answer,
        }).then();
    }
}


function cmd_handler_start(chatId, username) {
    select_row_from_table('USERS', 'id_user', chatId, (row) => {
        let answer;
        if (row) {
            answer = `С возвращением, ${row.user_name}!`;
        } else {
            const table = 'USERS';
            const fields = `id_user,'user_name','karma','deeds','validations'`;
            const values = `${chatId},'${username}',${START_KARMA},0,0`;

            insert_data(table, fields, values, () => {});
            answer = `🤖 Привет! Я, бот Хранитель Добра\n\n` +
                `🌍 Добро пожаловать в Зов Добра!\n` +
                `🙏 Здесь мы меняем мир к лучшему\n\n` +
                `💫 Держи +${START_KARMA} Karma за регистрацию!\n\n` +
                `⬇️ Выбери дальнейшее действие ⬇️`;
        }

        bot.sendMessage(chatId, answer, {
            reply_markup: {
                resize_keyboard: true,
                keyboard: [
                    [
                        {text: 'О боте'},
                        {text: 'Мой аватар'},
                        {text: 'Добавить доброе дело'}
                    ]
                ]
            }
        }).then();
    });
}

function cmd_handler_info(chatId) {
    const answer = `Я - бот Хранитель Зова Добра. Помогаю людям делать этот Мир добрее!
                    \n Подробное описание: https://telegra.ph/Pravila-blokchejn-agregatora-dobryh-del-Zov-Dobra-04-05`;
    bot.sendMessage(chatId, answer, {
        reply_markup: {
            resize_keyboard: true,
            keyboard: [
                [
                    {text: 'О боте'},
                    {text: 'Мой Аватар'},
                    {text: 'Добавить доброе дело'}
                ]
            ]
        }
    }).then();
}

function cmd_handler_user_info(chatId) {
    select_row_from_table('USERS', 'id_user', chatId, (row) => {
        const answer =
            `Твоя Karma: ${row?.karma} \nДобрые дела: ${row?.deeds} \nГолосования: ${row?.validations}`;

        bot.sendMessage(chatId, answer, { // await ???
            reply_markup: {
                resize_keyboard: true,
                keyboard: [
                    [
                        {text: 'О боте'},
                        {text: 'Мой Аватар'},
                        {text: 'Добавить доброе дело'}
                    ]
                ]
            }
        }).then();
    });
}

function cmd_handler_add_deed(chatId) {
    const answer = `Выбери тип доброго дела`;
    bot.sendMessage(chatId, answer, {
        reply_markup: {
            resize_keyboard: true,
            keyboard: [
                [
                    {text: 'Назад'},
                    {text: 'Фото'},
                    {text: 'Видео'},
                    {text: 'Файл'}
                ]
            ]
        }
    }).then();
}

function cmd_handler_back(chatId) {
    const answer = `Вы перешли в основное меню`;
    bot.sendMessage(chatId, answer, {
        reply_markup: {
            resize_keyboard: true,
            keyboard: [
                [
                    {text: 'О боте'},
                    {text: 'Мой Аватар'},
                    {text: 'Добавить доброе дело'}
                ]
            ]
        }
    }).then();
}

function cmd_handler_add_photo(chatId) {
    const answer = `Пришли мне фотографию твоего доброго дела`;
    bot.sendMessage(chatId, answer, {}).then();
}

function cmd_handler_add_video(chatId) {
    const answer = `Пришли мне видеозапись твоего доброго дела`;
    bot.sendMessage(chatId, answer, {}).then();
}

function cmd_handler_add_file(chatId) {
    const answer = `Пришли мне файл с описанием твоего доброго дела`;
    bot.sendMessage(chatId, answer, {}).then();
}

async function cmd_handler_add_karma(from_user, descr, msg_id, reply_to_msg) {
    if (!reply_to_msg) {
        const answer = `Вы не выбрали сообщение. Ответьте на сообщение пользователя командой "/addkarma <i>За то, что..</i>", чтобы инициировать голосование о начислении кармы.`;
        await bot.sendMessage(groupId, answer, {
            reply_to_message_id: msg_id,
            caption: answer,
            parse_mode: `HTML`,
            disable_notification: true,
        }).then();
    } else {
        const answer = `Пользователь @${from_user.username} инициировал голосование о начислении ${KARMA_BY_USER_VOTING} Karma @${reply_to_msg.from.username}.`
            + `\n\nОпиcание:\n`
            + `<i>${descr}</i>`;

        const value = `'${reply_to_msg.message_id}'`;
        await select_row_from_table('DEEDS', 'id_deed', value, (row) => {
            if (!row) {
                const text = `sample`;
                let table = 'DEEDS';
                let fields = `id_deed,upvote,downvote,is_validated,description,type`;
                let values = `'${reply_to_msg.message_id}',0,0,0,'${text}',4`;

                insert_data(table, fields, values, (err) => {
                    console.log(err);
                });

                table = `DEED_BY_USER`;
                fields = `id_user,id_deed,id_msg`;
                values = `${reply_to_msg.from.id},'${reply_to_msg.message_id}',0`;
                insert_data(table, fields, values, (err) => {
                    console.log(err);
                });
            }
        });

        await bot.sendMessage(groupId, answer, {
            reply_to_message_id: reply_to_msg.message_id,
            caption: answer,
            parse_mode: `HTML`,
            disable_notification: true,
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
}

async function handler_photo_received(chatId, username, photo, caption) {
    console.log(`handler_photo_received called by ${username} from chat ${chatId} with caption "${caption}"`)
    const answer = `Пользователь @${username} прислал новое доброе дело! #БытьДобру\n` +
    `\nОпиcание:\n` +
    `<i>${caption}</i>\n`;

    const value = `'${photo.file_unique_id}'`;
    await select_row_from_table('DEEDS', 'id_deed', value, (row) => {
        if (!row) {
            const text = `sample`;
            let table = 'DEEDS';
            let fields = `id_deed,upvote,downvote,is_validated,description,type`;
            let values = `'${photo.file_unique_id}',0,0,0,'${text}',1`;

            insert_data(table, fields, values, (err) => {
                console.log(err);
            });

            table = `DEED_BY_USER`;
            fields = `id_user,id_deed,id_msg`;
            values = `${chatId},'${photo.file_unique_id}',0`;
            insert_data(table, fields, values, (err) => {
                console.log(err);
            });
        }
    });

    console.log(`sendin' photo to group ${groupId}`)
    await bot.sendPhoto(groupId, photo.file_id, {
        caption: answer,
        parse_mode: `HTML`,
        disable_notification: true,
        reply_markup: {
            resize_keyboard: true,
            inline_keyboard: [
                [
                    {text: 'Дело доброе', callback_data: `yes`},
                    {text: 'Не очень доброе', callback_data: `no`}
                ]
            ]
        }
    }, () => {}).then();
}

async function handler_video_received(chatId, username, video, caption) {
    console.log(`handler_video_received called by ${username} from chat ${chatId} with caption "${caption}"`)
    const answer = `Пользователь @${username} прислал новое доброе дело! #БытьДобру\n` +
        `\nОпиcание:\n` +
        `<i>${caption}</i>\n`;

    // add deed to
    const value = `'${video.file_unique_id}'`;
    console.log(`received video with file_unique_id ${video.file_unique_id}`)
    await select_row_from_table('DEEDS', 'id_deed', value, (row) => {
        if (!row) {
            const text = `sample`;
            let table = 'DEEDS';
            let fields = `id_deed,upvote,downvote,is_validated,description,type`;
            let values = `${value},0,0,0,'${text}',2`;

            insert_data(table, fields, values, (err) => {
                console.log(err);
            });

            // Добавление доброго дела в табличку DEED_BY_USER
            table = `DEED_BY_USER`;
            fields = `id_user,id_deed,id_msg`;
            values = `${chatId},'${video.file_unique_id}',0`;
            insert_data(table, fields, values, (err) => {
                console.log(err);
            });
        }
    });

    console.log(`send video to group ${groupId}`)
    await bot.sendVideo(groupId, video.file_id, {
        caption: answer,
        parse_mode: `HTML`,
        disable_notification: true,
        reply_markup: {
            resize_keyboard: true,
            inline_keyboard: [
                [
                    {text: 'Дело доброе', callback_data: `yes`},
                    {text: 'Не очень доброе', callback_data: `no`}
                ]
            ]
        }
    }, () => {}).then();
}

async function handler_file_received(chatId, username, document, caption) {
    console.log(`handler_file_received called by ${username} from chat ${chatId} with caption "${caption}"`)
    const answer = `Пользователь @${username} прислал новое доброе дело! #БытьДобру\n` +
        `\nОпиcание:\n` +
        `<i>${caption}</i>\n`;

    // add deed to
    const value = `'${document.file_unique_id}'`;
    console.log(`received file with file_unique_id ${document.file_unique_id}`)
    await select_row_from_table('DEEDS', 'id_deed', value, (row) => {
        if (!row) {
            const text = `sample`;
            let table = 'DEEDS';
            let fields = `id_deed,upvote,downvote,is_validated,description,type`;
            let values = `${value},0,0,0,'${text}',3`;

            insert_data(table, fields, values, (err) => {
                console.log(err);
            });

            // Добавление доброго дела в табличку DEED_BY_USER
            table = `DEED_BY_USER`;
            fields = `id_user,id_deed,id_msg`;
            values = `${chatId},'${document.file_unique_id}',0`;
            insert_data(table, fields, values, (err) => {
                console.log(err);
            });
        }
    });

    console.log(`send file to group ${groupId}`)
    await bot.sendDocument(groupId, document.file_id, {
        caption: answer,
        parse_mode: `HTML`,
        disable_notification: true,
        reply_markup: {
            resize_keyboard: true,
            inline_keyboard: [
                [
                    {text: 'Дело доброе', callback_data: `yes`},
                    {text: 'Не очень доброе', callback_data: `no`}
                ]
            ]
        }
    }, () => {}).then();
}

async function handler_tag_received(msg, karma, answer) {
    update_karma(msg.from.id, karma);
    bot.sendMessage(groupId, answer, {
        reply_to_message_id: msg.message_id,
    }).then();
}

async function handler_unknown_message(chat_id) {
    const answer = `Я не понимаю тебя, человек 😢`;
    bot.sendMessage(chat_id, answer, {}).then();
}


// Database
function create_tables () {
    let qry;
    qry = `CREATE TABLE IF NOT EXISTS USERS (id_user INTEGER PRIMARY KEY, user_name	TEXT, karma INTEGER, deeds INTEGER, validations INTEGER)`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });

    qry = `CREATE TABLE IF NOT EXISTS DEEDS (id_deed TEXT PRIMARY KEY, upvote INTEGER, downvote INTEGER, is_validated INTEGER, description TEXT, type TEXT)`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });

    qry = `CREATE TABLE IF NOT EXISTS DEED_BY_USER (id_user INTEGER, id_deed TEXT, id_msg INTEGER)`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });

    qry = `CREATE TABLE IF NOT EXISTS VOTES (id_user INTEGER, ` +
                                            `id_deed TEXT, ` +
                                            `vote INTEGER, ` +
                                            `status INTEGER, ` +
                                            `PRIMARY KEY (id_user, id_deed)` +
                                            `);`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });
}

function select_data_from_table(table, condition, value, callback) {
    const qry = `SELECT * FROM ${table} WHERE ${condition}=${value};`;
    console.log(`select_data_from_table called with qry: ${qry}`);
    db.all(qry, [], (err, results) => {
        if (err) return console.error(err.message);
        callback(results);
    });
}

function select_row_from_table(table, condition, value, callback) {
    const qry = `SELECT * FROM ${table} WHERE ${condition}=${value}`;
    console.log(`select_row_from_table qry: ${qry}`)
    db.get(qry, [], (err, r) => {
        if (err) return console.error(err.message);
        callback(r);
    });
}

function insert_data(table, fields, values, callback) {
    let qry;
    qry = `INSERT INTO ${table}(${fields}) VALUES(${values})`;
    console.log(`insert_data qry: ${qry}`)
    db.run(qry, [], (err) => {
        callback(err);
    });
}

function update_votes(id_deed, column) {
    let qry;
    qry = `UPDATE DEEDS SET ${column} = ${column}+1 WHERE id_deed='${id_deed}';`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });
}

function update_voting_result(id_deed, result) {
    let qry;
    qry = `UPDATE DEEDS SET is_validated=${result} WHERE id_deed='${id_deed}';`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });
}

function update_karma(id_user, karma) {
    let qry;
    qry = `UPDATE USERS SET karma = karma+${karma} WHERE id_user='${id_user}';`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });
}

function update_add_deed(id_user) {
    let qry;
    qry = `UPDATE USERS SET deeds = deeds+1 WHERE id_user='${id_user}';`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });
}

function update_add_validations(id_user) {
    let qry;
    qry = `UPDATE USERS SET validations = validations+1 WHERE id_user='${id_user}';`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });
}

function delete_data(table, field, value) {
    let qry;
    qry = 'DELETE FROM ? WHERE ? = ?';
    // Example: 'DELETE FROM users WHERE id = value';
    db.run(qry, [table, field, value], (err) => {
        if (err) return console.error(err.message);
    });
}

function drop_table (table) {
    db.run('DROP TABLE ?', [table], (err) => {
        if (err) return console.error(err.message);
    });
}