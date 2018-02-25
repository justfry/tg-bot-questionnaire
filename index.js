const telegram = require('node-telegram-bot-api')
const token = require('./token')
const questions = require('./questions')
const endSubmission = require('./endSubmission')

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
        initializeUser(query.message.chat.id)
        user = getUser(query.message.chat.id)
        user.mode = "work"
        questionnaries = questions.map(el => {
            return([el.name])
        })

        bot.sendMessage(query.message.chat.id, 'Анкеты:', getMarkup(questionnaries))
    } else if (query.data == 'edit'){
        user = getUser(query.message.chat.id)
        user.mode = 'edit'
        bot.sendMessage(query.message.chat.id, "Пожалуйста, введите номер вопроса.")

    } else if (query.data == 'end'){
        user = getUser(query.message.chat.id)
        questionList = getQuestionList(user)
        endSubmission(user, questionList, bot)
        initializeUser(query.message.chat.id)
    } else {
        user = getUser(query.message.chat.id)
        questionList = getQuestionList(user)//пригодится для обновления сообщений
        question = questionList.find(el => {
            return el.main == query.message.text
        })
        if (query.data.includes("◽")){ //Если есть квадратит, то это чекбокс
            text = query.data.replace("◽", "") 
            checkbox = user.checkbox //сократим обращение
            checkbox.includes(text)? checkbox.splice(checkbox.indexOf(text), 1) : checkbox.push(text)

            buttons = question.extend.map(el => {
                return checkbox.includes(el)? {text: "☑️" + el, callback_data: "◽" + el} : {text: "◽" + el, callback_data: "◽" + el}
            })

            buttons.push({text: "Отправить", callback_data: "send"})
            keyboard = getKeyboard(buttons)
            bot.editMessageReplyMarkup(keyboard, {chat_id: query.message.chat.id, message_id: query.message.message_id}) //обновляем разметку у сообщения

        } else if (query.data == "send"){ //а если пользователь нажал "отправить", то сгружаем все выбранные кнопки в ответы
            text = user.checkbox.join(', ') // склеиваем массив в строку
            position = questionList.findIndex (el => {
                return el.main == query.message.text
            })
            addAnswer(user, text, position)
            user.checkbox = []
            user.mode == 'edit'? endOfQuestions(user) : askQuestion(user, user.ans.length) 
        } else {
            addAnswer(user, query.data)
            user.mode == 'edit'? endOfQuestions(user) : askQuestion(user, user.ans.length) 
        } 
    }
})

bot.on('text', (msg) => {
    user = getUser(msg.chat.id)
    if (user){
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
})

bot.on('polling_error', (err) => {
    console.log(err)
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

function getUser(chatID){ //если пользователь уже есть в состояниях, то возвращаем его данные
   return state.find(el => {
       return el.id == chatID
   }) 
}

function addAnswer(user, answer, numQuestion){
    numQuestion? user.ans[numQuestion] = answer : user.ans.push(answer)
}

function askQuestion(user, numQuestion){
    question = getQuestionList(user)[numQuestion]
    if (questionList[numQuestion].type == 'text'){
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

function getQuestionList(user){
    return questions.find(el => { //находим нужный нам список вопросов
        return el.name == user.quest
    }).questionList 
}

function endOfQuestions(user){
    let keyboard = getKeyboard([
        {text: "Редактировать", callback_data: 'edit'},
        {text: "Завершить", callback_data: 'end'}
    ], true)
    questionList = getQuestionList(user)
    text = user.ans.reduce((text, el, i) => {
        return text + ( i + 1 + ". " + questionList[i].main + "\n     " + el.substr(0,50) + '\n') //Телеграм не любит табуляцию, поэтому 5 пробелов
    }, "") //вообще, изучите reduce, офигенная штука
    bot.sendMessage(user.id, text, {reply_markup: keyboard})
    user.edit = -1
}

function initializeUser (id){
    user = getUser(id)
    if (user){
        user.ans = []
        user.mode = ""
        user.quest = ""
        user.checkbox = []
        user.edit = -1
    } else {
        state.push({"id": id, "ans": [], "mode": "", "quest": "", "checkbox": [], "edit": -1})
    }
}