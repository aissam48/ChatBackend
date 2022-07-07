const express = require('express')
const router = express.Router()
const multer = require("multer")
const AWS = require('aws-sdk')
const moment = require("moment")
const uuid = require("uuid")
const { ObjectId, ObjectID } = require('mongodb')
const { default: mongoose } = require('mongoose')
const { client } = require('../../app')
const access_key_id = process.env.ACCESS_KEY_ID
const secret_access_key = process.env.SECRET_ACCESS_KEY
AWS.config.update({
    accessKeyId: access_key_id,
    secretAccessKey: secret_access_key,
    region: 'eu-west-3'
})
const S3 = new AWS.S3({apiVersion: '2006-03-01'})
async function sendSocket(chatId , participants, message){
    const socketIO = require("../../app").SocketIO
    const io = require('../../app').IO
    const client  = require('../../app').client
  
    const fcm = require('../../app').fcm
    const chatDb  = client.db('chatDb')
    const usersDbCollection = chatDb.collection('users')
    console.log(chatId)
    io.to(chatId).emit("new_message", message)
    for await(const id of participants){
        await io.to(id).emit("chat_updated", "")
    }
    //TODO: Fix notification FCM to send to groups
    /*
    const senderMessage = await usersDbCollection.findOne({_id: ObjectId(participants[0])})
    const receiveNotification = await usersDbCollection.findOne({_id: ObjectId(participants[1])})
    const messagefcm = {
        notification: {
            title: senderMessage.first_name + " " +senderMessage.last_name,
            body: message.content_type =="text" ? message.message : message.content_type
        },
    }
    if(receiveNotification.token_firebase !=null){
        fcm.messaging().sendToDevice(receiveNotification.token_firebase ,messagefcm)
    }*/
}
exports.messagesByChat =async (req, res)=>{
    const group_id = req.params.chatId
    const limit  = req.params.limit
    const skip  = req.params.skip
    
    const mongodbClient = require('../../app').client
    const chatDb = mongodbClient.db("chatDb")
    const messagesCollection = chatDb.collection("messages")
    //const lastOpenedCollection = usersDb.collection("LastOpened")
  
    if(mongoose.isValidObjectId(group_id)){
        messagesCollection.find({group_id: ObjectId(group_id)}, { skip: Number(skip), limit: Number(limit) })
        .sort({_id:-1})
        .toArray().then(messagesResult=>{
            if(messagesResult.length == 0){
                res.status(200).json({
                    data:{
                        messages : []
                    }
                })
                
            }else{
                res.status(200).json({
                    data:{
                        messages : messagesResult
                    }
                })
            }
     
        })
    }else{
        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "chatId",
                    "message" : "chat Id not Valid"
                },
            ]
        })
        return
    }    
}
exports.sendMessage = async (req, res)=>{
    const socket = require('../../app').SocketIO
    const io = require('../../app').IO
    const jsonData = req.body
    if (jsonData.content_type == undefined || jsonData.content_type == null || jsonData.content_type == ""){
        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "content_type",
                    "message" : "content_type is empty",
                },
            ]
        })
        console.log("2")
        return
    }
    if (jsonData.sender_id == undefined || jsonData.sender_id == null || jsonData.sender_id == ""){
        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "sender_id",
                    "message" : "sender_id is empty",
                },
            ]
        })
        return
    } else if (jsonData.group_id == undefined || jsonData.group_id == null || jsonData.group_id == "" || jsonData.group_id == {} || jsonData.group_id == "Empty" || !mongoose.isValidObjectId(jsonData.group_id)){
        res.status(400).json({
                "code": -2,
                "key": "validationFailed",
                "errors" : [
                    {
                        "code" : -1,
                        "field" : "group_id",
                        "message" : "This group_id not found"
                    },
                ]
            })
            return
    }
    if(jsonData.content_type == "text"){
        sendText(jsonData, res)
    }else{
        sendMedia(jsonData, res, req)
    }
    
}
async function sendText(params, res){
    const mongodbClient = require('../../app').client
    const chatDb = mongodbClient.db("chatDb")
    const users = chatDb.collection("users")
    const messagesCollection = chatDb.collection("messages")
    const chatsCollection = chatDb.collection("chats")
    if (params.message == undefined || params.message == null || params.message == ""){
        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "message",
                    "message" : "message is empty"
                },
            ]
        })
        return
    }
    const chatObj = await chatsCollection.findOne({ _id: ObjectId(params.group_id) })
    const messageBody = {
        _id: ObjectId(),
        message : params.message,
        content_type : "text",
        group_id : ObjectId(params.group_id),
        sender_id :ObjectId(params.sender_id),
        created_at : moment().format(),
        chat_message_type: "",
        file : "",
        image: "",
        video: "",
        audio: ""
    }
    chatsCollection.updateOne({_id: ObjectId(params.group_id)},{$set:{recent_message :messageBody,updated_at: messageBody.created_at,}}, (err, result)=>{
        console.log("6")
        messagesCollection.insertOne(messageBody).then(async resultInsert=>{
            res.status(200).json({
                data:{
                    message : messageBody
                }
            })
            messageBody._id = params._id
            
            sendSocket(params.group_id, chatObj.participants, messageBody)
        })
    })
}
async function sendMedia(jsonData, res, req){
    var extension = ""
    var bucket = ""
    const mongodbClient = require('../../app').client
    const chatDb = mongodbClient.db("chatDb")
    const messagesCollection = chatDb.collection("messages")
    const chatsCollection = chatDb.collection("chats")
    if(req.file == undefined || req.file == {} || req.file == null ){
        res.status(400).json({
                "code": -2,
                "key": "validationFailed",
                "errors" : [
                    {
                        "code" : -1,
                        "field" : "file",
                        "message" : "file is empty"
                    },
                ]
            })
        return
    }
    switch(jsonData.content_type){
        case "video":{
            extension = ".mp4"
            bucket = "ajicreativevideos"
            break
        }
        case "audio":{
            extension = ".wav"
            bucket = "ajicreativeaudio"
            break
        }
        case "image":{
            extension = ".png"
            bucket = "ajicreativeimages"
            break
        }
    }
    const _idFile = ObjectId() 
    const params = {
        Bucket: bucket,
        Key: _idFile + extension,
        Body: req.file.buffer,
    }
    S3.upload(params, async(err, data)=>{
        if(err){
            res.status(500).json({
                code: -1,
                key: "serverProblem",
                message: "Server problem",
                description: "Please try later"
            })
            return
        }
        const chatObj = await chatsCollection.findOne({ _id: ObjectId(jsonData.group_id) })
        //const chatObj = await chatsCollection.findOne({ _id: ObjectId(jsonData.group_id) })
        console.log(chatObj)
        const messageBody = {
            _id: ObjectId(),
            message : "",
            content_type : jsonData.content_type,
            group_id : ObjectId(jsonData.group_id),
            sender_id : ObjectId(jsonData.sender_id),
            created_at : moment().format(),
            chat_message_type: "",
            file : "",
            image: "",
            video: "",
            audio: "",
        }

        var hostname = req.headers.host; // hostname = 'localhost:8080'
        var pathname = url.parse(req.url).pathname; // pathname = '/MyApp'
        switch(jsonData.content_type){
            case "video":{
                messageBody.video = hostname + "/api/v1/messages/video/buffer/"+_idFile+".mp4"
                break
            }
    
            case "audio":{
                messageBody.audio =  hostname + "/api/v1/messages/audio/buffer/"+_idFile+".wav"
                break
            }
    
            case "image":{
                messageBody.image =  hostname + "/api/v1/messages/image/buffer/"+_idFile+".png"
                break
            }
        }
        chatsCollection.updateOne({_id: ObjectId(jsonData.group_id)},{$set:{recent_message :messageBody,updated_at: messageBody.created_at,}}, (err, result)=>{
                                            
            messagesCollection.insertOne(messageBody).then(async resultInsert=>{
                res.status(200).json({
                    data:{
                        message : messageBody
                    }
                })
                messageBody._id = jsonData._id
                sendSocket(jsonData.group_id, chatObj.participants, messageBody)
            })
        })
    })
}
