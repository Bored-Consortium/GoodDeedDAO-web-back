const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv').config();


// replace the value below with the Telegram token you receive from @BotFather
const token = '6274532073:AAGBd8RzOJgQmmCTHXBkYHsugmYZXNK2XuA';
const webAppUrl = 'https://iridescent-brigadeiros-13cf7d.netlify.app';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});
const app = express();

let PORT = process.env.PROD_PORT;
console.log('Listening port: ' + PORT)

app.use(express.json());
app.use(cors())

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
    console.log("onText triggered: ", msg);

    const chatId = msg.chat.id;
    const resp = match[1]; // the captured "whatever"

    // send back the matched "whatever" to the chat
    //bot.sendMessage(chatId, resp);
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', async (msg) => {
    console.log("get message: ", msg);

    const chatId = msg.chat.id;
    const text = msg.text;

    // if (text === '/start') {
    //     await bot.sendMessage(chatId,'Заполни форму', {
    //         reply_markup: {
    //             keyboard: [
    //                 [{text: 'Открыть бота', web_app: {url: webAppUrl + '/form'}}] //, web_app: {url: webAppUrl + '/form'}
    //             ]
    //         }
    //     })
    // }

    if (msg?.web_app_data?.data) {
        try {
            const data = JSON.parse(msg.web_app_data?.data);
            await bot.sendMessage(chatId, 'Форма получена');
            await bot.sendMessage(chatId, 'Ваша страна: ' + data?.country);

            setTimeout(async () => {
                await bot.sendMessage(chatId, 'Спасибо за обращение');
            }, 1000)
        } catch (e) {
            await bot.sendMessage(chatId, 'Ошибка');
            console.log(e);
        }
    }
    
    // send a message to the chat acknowledging receipt of their message

});

app.post('/web-data', async (req, res) => {
    console.log("post triggered: ");

    const {queryId, products = [], totalPrice} = req.body;
    try {
        await bot.answerWebAppQuery(queryId, {
            type: 'article',
            id: queryId,
            title: 'Успешная покупка',
            input_message_content: {
                message_text: ` Поздравляю с покупкой, вы приобрели товар на сумму ${totalPrice}, ${products.map(item => item.title).join(', ')}`
            }
        })
        return res.status(200).json({});
    } catch (e) {
        return res.status(500).json({})
    }
})

app.listen(PORT, () => console.log('server started on PORT ' + PORT))