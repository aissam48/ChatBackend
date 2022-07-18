const { ObjectId } = require("mongodb")
const moment = require("moment")
const { default: mongoose } = require("mongoose")

exports.joinChatRoom = (client)=>{
    client.on("user_join_chat_room", (chatId)=>{
        client.join(chatId)
    })
}

exports.leaveChatRoom = (client)=>{
    // user has left chat room 
    client.on("user_leave_chat_room", (chatId)=>{
        client.leave(chatId)
    })
}



exports.callOther = (client, io, mongodbClient)=>{

    client.on("make_call", (data)=>{
        //data:{current_user_id, receiver_id, group_id}
        const jsonData = JSON.parse(data)
        //client.broadcast.emit("receive_call", jsonData)

        console.log(jsonData)
        const chatDb = mongodbClient.db("chatDb")
        const users = chatDb.collection("users")

        users.findOne({_id:ObjectId(jsonData.receiver_id)}).then(async user=>{
            console.log(user)
            if(user.at_calling){
                client.emit("user_at_another_call", jsonData)
            }else{
                await users.updateOne({_id: ObjectId(jsonData.current_user_id)}, {$set:{at_calling: true}})
                await users.updateOne({_id: ObjectId(jsonData.receiver_id)}, {$set:{at_calling: true}})
                io.to(jsonData.receiver_id).emit("receive_call", jsonData)
            }
        })
    })
}


exports.answerOther = (client, io)=>{

    client.on("answer_call", (data)=>{
        //data:{current_user_id receiver_id group_id}
        const jsonData = JSON.parse(data)
        io.to(jsonData.receiver_id).to(jsonData.current_user_id).emit("otherAnsweredStatus", jsonData)

    })
}


exports.endCall = (clinet, io, mongodbClient)=>{

    clinet.on("end_call",async (data)=>{
        //data:{current_user_id receiver_id}

        const chatDb = mongodbClient.db("chatDb")
        const users = chatDb.collection("users")
        const jsonData = JSON.parse(data)

        await users.updateOne({_id: ObjectId(jsonData.current_user_id)}, {$set:{at_calling: false}})
        await users.updateOne({_id: ObjectId(jsonData.receiver_id)}, {$set:{at_calling: false}})
        
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
        users.updateOne({_id: ObjectId(_id)}, {$set:{"is_connected": false, "last_opened": moment().format(), "at_calling":false}}).then(result=>{
            users.findOne({_id: ObjectId(_id)}).then(user=>{
                //notify all users which insid chat room with this user he logout
                client.broadcast.emit("user_disconnected", user)
            })
        })
    })
}




exports.lostInternet = (client, io, mongodbClient)=>{
    client.on("disconnecting", async (data)=>{
        for await (const _id of client.rooms) {

            if (mongoose.isValidObjectId(_id)) {
                const chatDb = mongodbClient.db("chatDb")
                const users = chatDb.collection("users")

                users.updateOne({_id: ObjectId(_id)}, {$set:{"is_connected": false, "last_opened": moment().format(), "at_calling": false}}).then(result=>{
                    users.findOne({_id: ObjectId(_id)}).then(user=>{
                        //notify all users which insid chat room with this user he logout
                        if(user != null){
                        client.broadcast.emit("user_disconnected", user)
                        }
                    })
                })
            }

          }
    })
}
