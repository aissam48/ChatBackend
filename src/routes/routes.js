const express = require('express')
const route = express.Router()
const multer = require("multer")



const STORAGE = multer.memoryStorage({destination : function(req, file,callback){
    callback(null, "")
}})

const multerAWS_S3 = multer({STORAGE}).single('file')

/////////////////////////////////////////////////////////////

const userController = require('../controllers/UserController')
const chatController = require('../controllers/ChatsController')
const messageController = require('../controllers/MessagesController')
const awsController = require("../controllers/AWSController")

route.post('/users/login', userController.signIn)
route.post('/users/register', userController.signUp)
route.get('/users/:userId', userController.userInfo)
route.get('/users/search/:query', userController.searchUsers)

route.get('/users/:userId/chats', chatController.chatsByUser)
route.get('/chats/:chatId/messages/:limit/:skip', messageController.messagesByChat)

route.post('/chats', chatController.createChat)

route.post('/messages', multerAWS_S3, messageController.sendMessage)

route.get('/messages/image/buffer/:id', awsController.getImageBuffer)
route.get('/messages/audio/buffer/:id', awsController.getAudioBuffer)
route.get('/messages/video/buffer/:id', awsController.getVideoBuffer)



module.exports = route 