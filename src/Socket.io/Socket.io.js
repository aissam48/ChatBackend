const { ObjectId } = require("mongodb")
const moment = require("moment")

exports.joinChatRoom = (client)=>{
    client.on("user_join_chat_room", (chatId)=>{
        client.join(chatId)
        //console.log(chatId)
    })
}

exports.leaveChatRoom = (client)=>{
    // user has left chat room 
    client.on("user_leave_chat_room", (chatId)=>{
        client.leave(chatId)
    })
}



exports.callOther = (client, io)=>{

    client.on("make_call", (data)=>{
        //data:{current_user_idreceiver_id group_id}
        const jsonData = JSON.parse(data)
        //client.broadcast.emit("receive_call", jsonData)
        console.log("make_call event")
        io.to(jsonData.receiver_id).emit("receive_call", jsonData)
    })
}


exports.answerOther = (client, io)=>{

    client.on("answer_call", (data)=>{
        //data:{current_user_id receiver_id group_id}
        const jsonData = JSON.parse(data)
        //console.log(jsonData)
        console.log("answer_call event")
        io.to(jsonData.receiver_id).to(jsonData.current_user_id).emit("otherAnsweredStatus", jsonData)

    })
}


exports.endCall = (clinet, io)=>{

    clinet.on("end_call", (data)=>{
        //data:{current_user_id receiver_id}

        const jsonData = JSON.parse(data)
        //console.log(jsonData)
        console.log("end_call event")
        io.to(jsonData.receiver_id).emit("end_call_status", jsonData)
        
    })
}


////////////////////////////////////////////////////////////////////
exports.joinChat = (client, io, mongodbClient)=>{
    client.on("user_join_chat", (userId)=>{
        client.join(userId)
        // Update user login status

        const chatDb = mongodbClient.db("chatDb")
        const users = chatDb.collection("users")
        users.updateOne({_id:ObjectId(userId)}, {$set:{is_connected: true}})
        // notify all users => must notify only friends (Contacts)
        io.emit("user_connected", userId)
    })
}


///////////////////////////////////////////////////////////////////
exports.userIsTyping = (client, io, mongodbClient)=>{
    client.on("user_is_typing", (data)=>{
        // data:{chat_id, current_user_id, receiver_id, is_typing}
        const jsonData = JSON.parse(data)
        // notify participants that user is typing or not
        io.to(jsonData.chat_id).emit("user_typing", data)
    })
}


exports.logOut = (client, io, mongodbClient)=>{
    client.on("user_leave_chat", (_id)=>{

        const chatDb = mongodbClient.db("chatDb")
        const users = chatDb.collection("users")
        users.updateOne({_id: ObjectId(_id)}, {$set:{"is_connected": false, "last_opened": moment().format()}}).then(result=>{
            users.findOne({_id: ObjectId(_id)}).then(user=>{
                //notify all users which insid chat room with this user he logout
                client.broadcast.emit("user_disconnected", user)
            })
        })
    })
}
