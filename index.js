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

// replace the value below with the Telegram token you receive from @BotFather
const token = '6274532073:AAGBd8RzOJgQmmCTHXBkYHsugmYZXNK2XuA';
const webAppUrl = 'https://iridescent-brigadeiros-13cf7d.netlify.app';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});
const app = express();

const PORT = process.env.PROD_PORT;

app.use(express.json());
app.use(cors())

// Listen for any kind of message. There are different kinds of messages.
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const username = msg.from.username;

    if (!text || !chatId) {
        console.log('text or chatId in msg is null');
        return;
    }

    if (text === '/start') {
        // Check if user has already been added into db
        select_row_from_table('USERS', 'id_user', chatId, (row) => {
            let answer;
            if (row) {
                answer = `Hi, ${row.user_name}!`;
            } else {
                const table = 'USERS';
                const fields = `id_user,'user_name','karma','deeds','validations'`;
                const values = `${chatId},'${username}',${start_karma},0,0`;

                insert_data(table, fields, values);
                answer = 'Well cum';
            }

            // await bot.sendMessage(chatId, answer, {
            //     reply_markup: {
            //         resize_keyboard: true,
            //         keyboard: [
            //             [
            //                 {text: 'О боте'},
            //                 {text: 'Мой персонаж'},
            //                 {text: 'Добавить доброе дело'}
            //             ]
            //         ]
            //     }
            // });
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
            });
        });
    }

    // if (msg?.web_app_data?.data) {
    //     try {
    //         const data = JSON.parse(msg.web_app_data?.data);
    //         await bot.sendMessage(chatId, 'get some auth data: ' + data);
    //         console.log('data: ' + data);
    //         //await bot.sendMessage(chatId, 'Форма получена');
    //         //await bot.sendMessage(chatId, 'Ваша страна: ' + data?.country);
    //
    //         setTimeout(async () => {
    //             await bot.sendMessage(chatId, 'Спасибо за обращение');
    //         }, 1000)
    //     } catch (e) {
    //         await bot.sendMessage(chatId, 'Ошибка');
    //         console.log(e);
    //     }
    // }

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


function create_tables () {
    let qry;
    qry = `CREATE TABLE IF NOT EXISTS USERS (id_user INTEGER PRIMARY KEY, user_name	TEXT, karma INTEGER, deeds INTEGER, validations INTEGER)`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });

    qry = `CREATE TABLE IF NOT EXISTS DEEDS (id_deed INTEGER PRIMARY KEY, upvote INTEGER, downvote INTEGER, is_validated INTEGER, description TEXT, type TEXT)`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });

    qry = `CREATE TABLE IF NOT EXISTS DEED_BY_USER (id_deed INTEGER, id_user INTEGER)`;
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

function select_row_from_table(table, conclusion, value, callback) {
    const qry = `SELECT * FROM ${table} WHERE ${conclusion}=${value}`;
    db.get(qry, [], (err, r) => {
        if (err) return console.error(err.message);
        callback(r);
    });
}

function insert_data(table, fields, values) {
    let qry;
    qry = `INSERT INTO ${table} (${fields}) VALUES(${values})`;
    db.run(qry, [], (err) => {
        if (err) return console.error(err.message);
    });
}

function update_data() {
    let qry;
    qry = 'UPDATE ? SET ? = ? WHERE ? = ?';
    // Example: 'UPDATE users SET name = ? WHERE id = ?'
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