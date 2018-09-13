const telegram = require('node-telegram-bot-api')
const token = require('./token')
const questions = require('./questions')
const endSubmission = require('./endSubmission')

let bot = new telegram(token, { polling: true })

let state = []

bot.onText(/\/start/, (msg) => {
    let keyboard = getKeyboard([
        {text: "Заполнить анкету", callback_data: 'beginning'}
    ])
    let hellomessage = "Привет, я бот. Выбери, что хочешь со мной сделать, семпай."
    bot.sendMessage(msg.chat.id, hellomessage, { reply_markup: keyboard })
})
bot.on('message', (msg) => {
    if (!msg.text) bot.sendMessage(msg.chat.id, "Пожалуйста ипользуйте только текст")
})

bot.on('callback_query', query => {
    bot.answerCallbackQuery(query.id)
    if (query.data == 'beginning'){
        initializeUser(query.message.chat.id)
        getUser(query.message.chat.id, user => {
            user.mode = "work"
            questionnaries = questions.map(el => {
                return([el.name])
            })
        })
        bot.sendMessage(query.message.chat.id, 'Анкеты:', getMarkup(questionnaries))
    } else if (query.data == 'edit'){
        getUser(query.message.chat.id, user => {
            user.mode = 'edit'
            bot.sendMessage(query.message.chat.id, "Пожалуйста, введите номер вопроса.")
        })
    } else if (query.data == 'end'){
        getUser(query.message.chat.id, user => {
            questionList = getQuestionList(user)
            endSubmission(user, questionList, bot)
            initializeUser(query.message.chat.id)
        })
    } else {
        getUser(query.message.chat.id, user => {
            questionList = getQuestionList(user)//пригодится для обновления сообщений
            question = questionList.find(el => {
                return el.main == query.message.text
            })
            position = questionList.findIndex (el => {
                return el.main == query.message.text
            })
            if (query.data.includes("◽")){ //Если есть квадратит, то это чекбокс
                text = query.data.replace("◽", "") 
                checkbox = user.checkbox //сократим обращение
                checkbox.includes(text) ? checkbox.splice(checkbox.indexOf(text), 1) : checkbox.push(text)

                buttons = question.extend.map(el => {
                    return checkbox.includes(el) ? { text: "☑️" + el, callback_data: "◽" + el } : { text: "◽" + el, callback_data: "◽" + el }
                })

                buttons.push({text: "Отправить", callback_data: "send"})
                keyboard = getKeyboard(buttons)
                bot.editMessageReplyMarkup(keyboard, {chat_id: query.message.chat.id, message_id: query.message.message_id}) //обновляем разметку у сообщения
            } else if (query.data == "send"){ //а если пользователь нажал "отправить", то сгружаем все выбранные кнопки в ответы
                text = user.checkbox.join(', ') // склеиваем массив в строку
                addAnswer(user, text, position)
                user.checkbox = []
                user.mode == 'edit' ? endOfQuestions(user) : askQuestion(user, user.ans.length) 
            } else {
                addAnswer(user, query.data, position)
                user.mode == 'edit' ? endOfQuestions(user) : askQuestion(user, user.ans.length) 
            } 
        }
    )}
})


bot.on('text', (msg) => getUser(msg.chat.id, user => {
    if (user && msg.text != "/start"){
        if (user.mode == "work"){ // если мод рабочий
            if (!user.quest){ //если еще не установлено, какую анкету заполняет юзер
                user.quest = msg.text
            } else {
                addAnswer(user, msg.text) //если известно, значит он отвечает на вопрос
            }
            questionList = getQuestionList(user)
            currentQuestion = user.ans.length //на каком вопросе сейчас находится пользователь
            if (currentQuestion < questionList.length){
                askQuestion(user, currentQuestion)
            } else {
                endOfQuestions(user)
            }
            
        } else if (user.mode == "edit"){
            if (user.edit == -1){
                user.edit = msg.text - 1
                askQuestion(user, user.edit)
            } else {
                addAnswer(user, msg.text, user.edit)
                endOfQuestions(user)
                user.edit = -1
            }
        }   
    }
}))

bot.on('polling_error', (err) => {
    console.log(err)
})

const getKeyboard = (keyboardButtons, oneline = false) => {
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

const getMarkup = (markupButtons) => { 
    return {
        reply_markup:JSON.stringify({
        keyboard:  markupButtons,
        one_time_keyboard: true //чтобы скрылась сразу после отправки сообщения
        })
    }
}

const getUser = (chatID, callback) => { //если пользователь уже есть в состояниях, то возвращаем его данные
   user = state.find(el => {
       return el.id == chatID
   }) 
   callback(user)
}

const addAnswer = (user, answer, numQuestion) => {
    typeof numQuestion !== "undefined"? user.ans[numQuestion] = answer : user.ans.push(answer)
}

const askQuestion = (user, numQuestion) => {
    questionList = getQuestionList(user)
    question = questionList[numQuestion]
    if (question.type == 'text'){
        text = question.main + "\n" + question.extend //склеиваем вопрос с пояснением  
        bot.sendMessage(user.id, text)
    } else if (question.type == 'buttons'){
        text = question.main
        buttons = question.extend.map(el => {
            return {text: el, callback_data: el}
        })
        keyboard = getKeyboard(buttons)
        bot.sendMessage(user.id, text, {reply_markup: keyboard})
    } else if (question.type == 'checkbox'){
        text = question.main
        buttons = question.extend.map(el => {
            return {text: "◽" + el, callback_data: "◽" + el}
        })
        buttons.push({text: "Отправить", callback_data: "send"})
        keyboard = getKeyboard(buttons)
        bot.sendMessage(user.id, text, {reply_markup: keyboard})
    }
    
}

const getQuestionList = user => {
    return questions.find(el => { //находим нужный нам список вопросов
        return el.name == user.quest
    }).questionList 
}

const endOfQuestions = user => {
    let keyboard = getKeyboard([
        {text: "Редактировать", callback_data: 'edit'},
        {text: "Завершить", callback_data: 'end'}
    ], true)
    questionList = getQuestionList(user)
    text = user.ans.reduce((text, el, i) => {
        return text + ("<strong>" + (i + 1) + ". " + questionList[i].main + "</strong>\n     " + el + '\n') //Телеграм не любит табуляцию, поэтому 5 пробелов
    }, "")
    bot.sendMessage(user.id, text, {parse_mode: "HTML", reply_markup: keyboard})
    user.edit = -1
}

const initializeUser = id => getUser(id, user => {
    if (user){
        user.ans = []
        user.mode = ""
        user.quest = ""
        user.checkbox = []
        user.edit = -1
    } else {
        state.push({"id": id, "ans": [], "mode": "", "quest": "", "checkbox": [], "edit": -1})
    }
})