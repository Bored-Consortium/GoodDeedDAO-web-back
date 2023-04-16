const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();


const db = new sqlite3.Database('data_folder/gooddeeds.db',(err) => {
    if (err) {
        console.log('Could not connect to database', err)
    } else {
        console.log('Connected to database')
    }
});

create_tables();
// const db = new sqlite3.Database('gooddeeds.db', sqlite3.OPEN_READWRITE, (err) => {
//     if (err) return console.error(err.message);
// });

const start_karma = 10;
const groupId = -1001952022933;
// replace the value below with the Telegram token you receive from @BotFather
const token = '6274532073:AAGBd8RzOJgQmmCTHXBkYHsugmYZXNK2XuA';
const webAppUrl = 'https://iridescent-brigadeiros-13cf7d.netlify.app';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});
const app = express();

const PORT = process.env.PROD_PORT;

app.use(express.json());
app.use(cors())

bot.on('message', async (msg) => {
    let photo_id;
    const chatId = msg.chat.id;
    const text = msg.text;
    const username = msg.from.username;

    if (!chatId) {
        console.log('chatId in msg is null');
        return;
    }

    if (msg.photo) {
        console.log(`Gettin' photo id`);
        photo_id = msg.photo[msg.photo.length - 1].file_id;
    }

    if (text === '/start') {
        cmd_handler_start(chatId, username);
    } else if (text === '/help' || text === 'О боте') {
        cmd_handler_info(chatId);
    } else if (text === '/userinfo' || text === 'Мой персонаж') {
        cmd_handler_user_info(chatId);
    } else if (text === '/adddeed' || text === 'Добавить доброе дело') {
        cmd_handler_add_deed(chatId);
    } else if (text === '/back' || text === 'Назад') {
        cmd_handler_back(chatId);
    } else if (text === '/addphoto' || text === 'Фото') {
        cmd_handler_add_photo(chatId);
    } else if (photo_id) {
        await handler_photo_received(chatId, username, photo_id);
    }
});


bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const opts = {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
    };

    let photo_id;
    if (msg.photo) {
        photo_id = msg.photo[msg.photo.length - 1].file_id;
    }

    // Add deed to db
    const value = `'${photo_id}'`;
    select_row_from_table('DEEDS', 'id_deed', value, (row) => {
        if (!row) {
            const text = `This is a sample text`;
            let table = 'DEEDS';
            let fields = `id_deed,upvote,downvote,is_validated,description,type`;
            let values = `'${photo_id}',0,0,0,'${text}',1`;

            insert_data(table, fields, values);

            // Добавление доброго дела в табличку DEED_BY_USER
            table = `DEED_BY_USER`;
            fields = `id_user,id_deed`;
            values = `${opts.chat_id},'${photo_id}'}`;
            insert_data(table, fields, values);
        }
    });

    is_voting_finished(photo_id, (is_voting_finished, upvotes, downvotes) => {
        if (is_voting_finished) { return; }

        if (action === 'yes' && !is_voting_finished) {
            update_votes(photo_id, `upvote`);
            if (upvotes + 1 === 5) {
                set_voting_finished(photo_id, 1);
                // add karma
                // increaseKarma();
                // send message
            } else {  }

            console.log('You hit button yes');

        } else if (action === `no` && !is_voting_finished) {
            update_votes(photo_id, `downvote`);
            if (downvotes + 1 === 5) {
                set_voting_finished(photo_id, -1);
                // send message
            } else {  }
            console.log('You hit button no');
        } else {
            console.log('You hit');
        }
    });
});


app.post('/web-data', async (req, res) => {
    console.log('THIS IS CONSOLE');
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

app.listen(PORT, () => console.log('server started on PORT ' + PORT));


function is_voting_finished(photo_id, callback) {
    select_row_from_table('DEEDS', 'id_deed', `'${photo_id}'`, (row) => {
        console.log(row);
        if (row) {
            if (row?.is_validated) {
                callback(true, row?.upvote, row?.downvote);
            } else {
                callback(false, row?.upvote, row?.downvote);
            }
        }
    });
}

function set_voting_finished(id_photo, result) {
    update_voting_result(id_photo, result);
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

            insert_data(table, fields, values);
            answer = 'Well cum';
        }

        // await bot.sendMessage(chatId, answer, {
        bot.sendMessage(chatId, answer, {
            reply_markup: {
                resize_keyboard: true,
                keyboard: [
                    [
                        {text: 'О боте'},
                        {text: 'Мой персонаж'},
                        {text: 'Добавить доброе дело'}
                    ]
                ]
            }
        }).then();
    });
}

function cmd_handler_info(chatId) {
    const answer = `I'm ZovDobra bot. Let's make this world dobrim again!`;
    bot.sendMessage(chatId, answer, {
        reply_markup: {
            resize_keyboard: true,
            keyboard: [
                [
                    {text: 'О боте'},
                    {text: 'Мой персонаж'},
                    {text: 'Добавить доброе дело'}
                ]
            ]
        }
    }).then();
}

function cmd_handler_user_info(chatId) {
    select_row_from_table('USERS', 'id_user', chatId, (row) => {
        const answer =
            `Твоя карма: ${row.karma} \nДобрые дела: ${row.deeds} \nВалидации: ${row.validations}`;

        bot.sendMessage(chatId, answer, { // await ???
            reply_markup: {
                resize_keyboard: true,
                keyboard: [
                    [
                        {text: 'О боте'},
                        {text: 'Мой персонаж'},
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
                    {text: 'Мой персонаж'},
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

async function handler_photo_received(chatId, username, photo_id) {
    const answer = `Пользователь @${username} прислал новое доброе дело! Валидаторы всех стран, объядиняйтесь!`;

    await bot.sendPhoto(groupId, photo_id, {
        caption: answer,
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
    }, (newValidation) => {
        console.log(newValidation);
    }).then();
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

    qry = `CREATE TABLE IF NOT EXISTS DEED_BY_USER (id_user INTEGER, id_deed TEXT)`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });

    qry = `CREATE TABLE IF NOT EXISTS VOTES (id_user INTEGER, id_deed TEXT, vote INTEGER, status INTEGER)`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });
}

function select_data_from_table(table) {
    let qry;
    qry = 'SELECT * from ?';
    db.all(qry, [table], (err, rows) => {
        if (err) return console.error(err.message);
        rows.forEach((row) => {
            console.log(row);
        });
    });
}

function select_row_from_table(table, condition, value, callback) {
    const qry = `SELECT * FROM ${table} WHERE ${condition}=${value}`;
    db.get(qry, [], (err, r) => {
        if (err) return console.error(err.message);
        callback(r);
    });
}

function insert_data(table, fields, values) {
    let qry;
    qry = `INSERT INTO ${table} (${fields}) VALUES(${values})`;
    console.log(qry);
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });
}

function update_votes(id_deed, column) {
    let qry;
    qry = `UPDATE DEEDS SET ${column} = ${column}+1 WHERE id_deed='${id_deed}';`;
    console.log(qry);
    // Example: 'UPDATE users SET name = ? WHERE id = ?'
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });
}

function update_voting_result(id_deed, result) {
    let qry;
    qry = `UPDATE DEEDS SET is_validated=${result} WHERE id_deed='${id_deed}';`;
    console.log(qry);
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