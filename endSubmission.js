const pdfkit = require("pdfkit")
const pdfmake = require('pdfmake')
const fs = require("fs")
const dateformat = require('dateformat')
const sanitize = require('sanitize-filename')
const nodemailer = require('nodemailer')

let transporter = nodemailer.createTransport({
    type: 'smtp',
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false,
    tls: {rejectUnauthorized:false}
})
const fonts = {
    Roboto: {
		normal: 'fonts/Roboto-Regular.ttf',
		bold: 'fonts/Roboto-Medium.ttf',
		italics: 'fonts/Roboto-Italic.ttf',
		bolditalics: 'fonts/Roboto-MediumItalic.ttf'
    }
}
const pdfPrinter = new pdfmake(fonts)
module.exports = endSubmission

function endSubmission(user, questionList, bot){
    fileName = getFileName(user)
    makePDF(user, fileName, questionList, bot)
}

function getFileName(user){
    date = new Date()
    return sanitize(user.id + '_' + user.quest + '_' + dateformat(date, 'dd.mm (HH-MM)') + '.pdf')
}



function makePDF(user, filename, questionList, bot){
    stream = fs.createWriteStream("./output/" + fileName)
    docDefinition = getDocDefinition(user, questionList)
    pdfDoc = pdfPrinter.createPdfKitDocument(docDefinition)
    pdfDoc.pipe(stream)
    pdfDoc.end()
    stream.on('finish', () => {
        sendFile(user, fileName, bot)
    })
}

function getDocDefinition(user, questionList){
    return {
        footer: function(currentPage, pageCount) { return {
            text : "СТРАНИЦА:    " + currentPage.toString(),
            alignment: 'right',
            fontSize: 6,
            margin: [0, 0, 60, 30],
            color: '#444'
            } 
        },
        content: [{
			image: 'img/logo.png',
			width: 100,
			alignment: 'center'
        },
        {
            text: "JUST FRY DESIGN ", 
            fontSize: 18, 
            alignment: 'center',
            margin: [0, 30, 0, 30]
        },
        {
			text: [
				"Это основной текст для ответов на вопросы."
				],
            bold: false,
            fontSize: 10,
            margin: [45, 5, 0, 30]
		},
        {
            fontSize: 10,
            style: 'tableExample',
            table: {
                widths: [150,285],
				body: getBodyTable(user,questionList)
            }, fillColor: '#eeeeee', layout: {
                    hLineWidth: function (i, node) {
                        return 0.5;
                    },
                    vLineWidth: function (i, node) {
                        return  0.1;
                     },
        hLineColor: '#dbdbdb',
        vLineColor: '#dbdbdb',

        }
        }],
        styles: {
            tableExample: {
                margin: [45, 5, 0, 60]
            } 
        }
    }
}

function getBodyTable(user, questionList){
    return user.ans.map((el,i) => {
        question = questionList[i]
        return  [[{text:question.main, bold: true}, question.type == 'text'? question.extend : ""], user.ans[i]]
    })
}

function sendFile(user, fileName, bot){
    fs.createReadStream("./output/" + fileName) 
    bot.sendDocument(user.id, "./output/" + fileName)
}