const telegram = require('node-telegram-bot-api')
const token = require('./token')
const questions = require('./questions')

let bot = new telegram(token, {polling: true})

let state = []

bot.onText(/\/start/, (msg) => {
    let keyboard = getKeyboard([
        {text: "Заполнить анкету", callback_data: 'beginning'}
    ])
    let hellomessage = "Привет, я бот. Выбери, что хочешь со мной сделать, семпай."
    bot.sendMessage(msg.chat.id, hellomessage, {reply_markup: keyboard})
})

bot.on('callback_query', (query) => {
    if (query.data == 'beginning'){
        bot.answerCallbackQuery(query.id)

        state.push({"id": query.message.chat.id, "ans": [], "mode": "work", "quest": ""} )
        
        questionnaries = questions.map(el => {
            return([el.name])
        })

        bot.sendMessage(query.message.chat.id, 'Анкеты:', getMarkup(questionnaries))
    }
})

bot.on('text', (msg) => {
    user = getUser(msg.chat.id)
    if (user){
        if (user.mode == "work"){ // если мод рабочий
            if (!user.quest){ //если еще не установлено, какую анкету заполняет юзер
                user.quest = msg.text
            } else {
                user.ans.push(msg.text) //если известно, значит он отвечает на вопрос
            }
            questionList = questions.find(el => { //находим нужный нам список вопросов
                return el.name == user.quest
            }).questionList 

            currentQuestion = user.ans.length //на каком вопросе сейчас находится пользователь
            if (currentQuestion < questionList.length){
                text = questionList[currentQuestion].main + "\n" + questionList[currentQuestion].extend //склеиваем вопрос с пояснением
                bot.sendMessage(msg.chat.id, text)
            } else {
                bot.sendMessage(msg.chat.id, "Вопросы закончились")
                user.mode = "stopped"
                console.log(user.ans)
            }
            
        }
        
    }
})

function getKeyboard(keyboardButtons, oneline = false) {
    if (oneline){
        keyboardButtons = [keyboardButtons]
    } else {
        keyboardButtons.forEach((el, i, arr) => {
           arr[i] = [el]
        })
    }
    return keyboardButtons = {
        inline_keyboard: keyboardButtons
    }
}

function getMarkup(markupButtons){ 
    return {
        reply_markup:JSON.stringify({
        keyboard:  markupButtons,
        one_time_keyboard: true //чтобы скрылась сразу после отправки сообщения
        })
    }
}

function getUser(chatID){ //если пользователь уже есть в состояниях, то возвращаем его данные, если нет, то чо тут сделаешь, false
   for (i = 0; i < state.length; i++){
       if (chatID == state[i].id){
           return state[i]
       } else {
           return false
       }
   }
}

function addAnswer(user, numQuestion, answer){
    user.ans[numQuestion] = answer;
}