const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();


const db = new sqlite3.Database('./data_folder/gooddeeds.db',(err) => {
    if (err) {
        console.log('Could not connect to database', err)
    } else {
        console.log('Connected to database')
    }
});

create_tables();

const start_karma = 10;
const dobro_tag = `#бытьдобру`;

const groupId = Number(process.env.GROUP_ID);
const token = process.env.BOT_TOKEN;

const webAppUrl = 'https://iridescent-brigadeiros-13cf7d.netlify.app';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(cors())

bot.on('text', async (msg) => {
    const chat_id = msg.chat.id;
    const text = msg.text;
    const username = msg.from.username;

    if (!chat_id) {
        console.log('chat_id in msg is null');
        return;
    }

    console.log(`user ${username} send text`)

    if (chat_id === groupId) {
        if (text?.toLowerCase().includes(dobro_tag)) {
            const karma = 5;
            await handler_tag_received(msg, karma);
        }
        return;
    }

    if (text === '/start') {
        cmd_handler_start(chat_id, username);
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
        await handler_video_received(chat_id);
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
        if (text?.toLowerCase().includes(dobro_tag) || is_tag_in_caption) {
            const karma = 5;
            await handler_tag_received(msg, karma);
        }
        return;
    }

    await handler_photo_received(chat_id, username, photo, caption);
});

bot.on('video', async (msg) => {

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
    const opts = {
        caption: msg.caption,
        chat_id: msg.chat.id,
        message_id: msg.message_id,
    };

    let photo_unique_id;
    if (msg.photo) {
        photo_unique_id = msg.photo[msg.photo.length - 1].file_unique_id;
    }

    is_voting_finished(photo_unique_id, (is_voting_finished, upvotes, downvotes) => {
        const deed = {
            id: photo_unique_id,
            upvotes: upvotes,
            downvotes: downvotes,
            finished: is_voting_finished,
        };
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


app.post('/web-data', async (req, res) => {
    const {queryId, products = [], totalPrice} = JSON.parse(req.body);
    try {
        await bot.answerWebAppQuery(queryId, {
            type: 'article',
            id: queryId,
            title: 'Успешная покупка',
            input_message_content: {
                message_text: ` Поздравляю с покупкой, вы приобрели товар на сумму ${totalPrice}, ${products.map(item => item.title).join(', ')}`
            }
        })
        return res.status(200).json({res: 0});
    } catch (e) {
         return res.status(500).json({id: queryId, error: e});
    }
})


function is_voting_finished(photo_id, callback) {
    select_row_from_table('DEEDS', 'id_deed', `'${photo_id}'`, (row) => {
        if (row) {
            if (row?.is_validated === 1 || row?.is_validated === -1) {
                callback(true, row?.upvote, row?.downvote);
            } else {
                callback(false, row?.upvote, row?.downvote);
            }
        }
    });
}

//function if_voting_is_finished() {}

function set_voting_finished(id_photo, result, username, karma, opts) {
    update_voting_result(id_photo, result);
    let res = ``;
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

    /* Add Karma to voters */
    const voter_karma = Math.ceil(karma * 0.03);
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
    if (sender.action === 'yes') {
        update_votes(deed.id, `upvote`);
        opts.caption = opts.caption + `${new_line}\n@${sender.username} проголосовал "за"`;
        bot.editMessageCaption(opts.caption, {
            chat_id: groupId,
            //parse_mode: `Markdown`,
            message_id: opts.message_id,
            reply_markup: {
                resize_keyboard: true,
                inline_keyboard: [
                    [
                        {text: 'Дело доброе', callback_data: `yes`},
                        {text: 'Не очень доброе', callback_data: `no`}
                    ]
                ]
            }
        }).then();

        if (deed.upvotes + 1 === 5) {
            const karma = 50;
            set_voting_finished(deed.id, 1, creator.username, karma, opts);
            update_karma(creator.id, karma);
            update_add_deed(creator.id);
            const answer = 'Поздравляю, ты сделал Доброе Дело! Я начислил тебе 50 Karma';
            bot.sendMessage(creator.id, answer, {
                parse_mode: `Markdown`,
            }).then();

        } else {
            bot.answerCallbackQuery(sender.callback_id, {
                text: `Голос "за" дело учтён!`,
            }).then();
        }

    } else if (sender.action === `no`) {
        update_votes(deed.id, `downvote`);
        opts.caption = opts.caption + `${new_line}\n@${sender.username} проголосовал "против"`;
        bot.editMessageCaption(opts.caption, {
            chat_id: groupId,
            //parse_mode: `Markdown`,
            message_id: opts.message_id,
            reply_markup: {
                resize_keyboard: true,
                inline_keyboard: [
                    [
                        {text: 'Дело доброе', callback_data: `yes`},
                        {text: 'Не очень доброе', callback_data: `no`}
                    ]
                ]
            }
        }).then();

        if (deed.downvotes + 1 === 5) {
            const karma = 5;
            set_voting_finished(deed.id, -1, creator.username, karma, opts);
            update_karma(creator.id, karma);
            const answer = 'Сообщество не посчитало это дело достаточно добрым. Я начислил тебе утешительные 5 _Karma_!';
            bot.sendMessage(creator.id, answer, {
                parse_mode: `Markdown`,
            }).then();
        } else {
            bot.answerCallbackQuery(sender.callback_id, {
                text: `Голос против этого дела учтён!`,
            }).then();
        }

    } else {
        console.log('You hit');
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
            const values = `${chatId},'${username}',${start_karma},0,0`;

            insert_data(table, fields, values, () => {});
            answer = '🤖 Привет! Я, бот Хранитель Добра\n\n' +
                '🌍 Добро пожаловать в Зов Добра!\n' +
                '🙏 Здесь мы меняем мир к лучшему\n\n' +
                '💫 Держи +10 Karma за регистрацию!\n\n' +
                '⬇️ Выбери дальнейшее действие ⬇️';
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
                    {text: 'Видео'}
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
    const answer = `Пришли мне фотографию`;
    bot.sendMessage(chatId, answer, {}).then();
}

async function handler_photo_received(chatId, username, photo, caption) {
    console.log(`handler_photo_received called by ${username} from chat ${chatId} with caption "${caption}"`)
    const answer = `Пользователь @${username} прислал новое доброе дело! #БытьДобру\n` +
    `\nОпиcание:\n` +
    `<i>${caption}</i>\n`;

    // add deed to
    const value = `'${photo.file_unique_id}'`;
    await select_row_from_table('DEEDS', 'id_deed', value, (row) => {
        if (!row) {
            const text = `This is a sample text`;
            let table = 'DEEDS';
            let fields = `id_deed,upvote,downvote,is_validated,description,type`;
            let values = `'${photo.file_unique_id}',0,0,0,'${text}',1`;

            insert_data(table, fields, values, (err) => {
                console.log(err);
            });

            // Добавление доброго дела в табличку DEED_BY_USER
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

async function handler_video_received(chat_id) {
    const answer = `Пока что я не умею обрабатывать видео, но обязательно скоро научусь!`;
    bot.sendMessage(chat_id, answer, {}).then();
}

async function handler_tag_received(msg, karma) {
    update_karma(msg.from.id, karma);
    const answer = `@${msg.from.username}, спасибо за твое пожелание! Держи +${karma} Karma`;
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
    db.get(qry, [], (err, r) => {
        if (err) return console.error(err.message);
        callback(r);
    });
}

function insert_data(table, fields, values, callback) {
    let qry;
    qry = `INSERT INTO ${table}(${fields}) VALUES(${values})`;
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