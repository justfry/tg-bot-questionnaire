const telegram = require('node-telegram-bot-api')
const token = require('./token')

let bot = new telegram(token, {polling: true})

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "В чем сила, брат")
})

bot.onText(/В правде/, (msg) => {
    bot.sendMessage(msg.chat.id, "Брат)))")
})