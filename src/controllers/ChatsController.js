const { ObjectId } = require('mongodb')
const { default: mongoose } = require('mongoose')
const moment = require('moment')

exports.chatsByUser =async (req, res)=>{

    const userId = req.params.userId

    const mongodbClient = require('../../app').client
    const chatDb = mongodbClient.db("chatDb")
    const users = chatDb.collection("users")
    const chatsCollection = chatDb.collection("chats")


    if(!mongoose.isValidObjectId(userId)){
        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "userId",
                    "message" :  "Require a valid userID"
                },
            ]
        })
        return
    }else{

        const user = await users.findOne({_id:ObjectId(userId)})
        if(user == undefined || user == null || user == {} || user == ""){

            res.status(400).json({
                "code": -2,
                "key": "validationFailed",
                "errors" : [
                    {
                        "code" : -1,
                        "field" : "userId",
                        "message" :  "Require a valid userID"
                    },
                ]
            })
            return
        }

        var groups = []
        for await(const i of user.groups){
            const grp = await chatsCollection.findOne({_id:ObjectId(i)})
            for await (const i of grp.participants){
                if(i != userId){
                    const user_ = await users.findOne({_id:ObjectId(i)})
                    const finallChatObj = {
                        created_at : grp.created_at,
                        group_type : grp.group_type,
                        participants : grp.participants,
                        recent_message :grp.recent_message,
                        updated_at: grp.updated_at,
                        _id : grp._id,
                        user:user_
                    }
                    if( grp.recent_message._id != null){
                        groups.push(finallChatObj)
                    }

                }
            }
        }

        if(groups.length == 0){
            res.status(200).json({
                
                data:{
                    chats:[]
                }
            })
        }else{
            res.status(200).json({
                
                data:{
                    chats:groups
                }
            })
        }
    }

}

exports.createChat = async (req, res)=>{

    const mongodbClient = require('../../app').client
    const chatDb = mongodbClient.db("chatDb")
    const users = chatDb.collection("users")
    const chatsCollection = chatDb.collection("chats")

    const body = req.body

    if(body.participants[0]==null || body.participants[1]==null || body.participants[0]== undefined || body.participants[1]== undefined){
        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "participants",
                    "message" :  "Require a valid participants id"
                },
            ]
        })
        return
    }
     
    if(!mongoose.isValidObjectId(body.participants[0]) || !mongoose.isValidObjectId(body.participants[1])){
        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "participants",
                    "message" :  "Require a valid participants id"
                },
            ]
        })
        return
    }

    const chatCreatedByMe = await chatsCollection.findOne({participants: body.participants})
    const chatCreatedByHim = await chatsCollection.findOne({participants: body.participants.reverse()})
 

    if(chatCreatedByMe != {} && chatCreatedByMe != null && chatCreatedByMe != undefined){
        res.status(200).json({
            data:{
                chat:chatCreatedByMe
            }
        })
        return
       
    }else if(chatCreatedByHim != {} && chatCreatedByHim != null && chatCreatedByHim != undefined){
        res.status(200).json({
            data:{
                chat:chatCreatedByHim
            }
        })
        return
        
    }else{
        createChat()
        return
    }


    function createChat(){
        const chatBody = {
            _id : ObjectId(),
            group_type: "normal",
            participants :body.participants,
            recent_message : {},
            created_at: moment().format(),
            updated_at: moment().format()
        }
        chatsCollection.insertOne(chatBody).then(async result=>{

            for await(const id of body.participants){
                users.findOne({_id:ObjectId(id)}, (err, resultUser)=>{
                    resultUser.groups.push(ObjectId(chatBody._id))
                    users.updateOne({_id:ObjectId(id)}, {$set:{groups:resultUser.groups}})
                })
            }

            res.status(200).json({
                data:{
                    chat:chatBody
                }
            })
        }).catch(err=>{
            res.status(500).json({
                code: -1,
                key: "serverProblem",
                message: "Server problem",
                description: "Please try later"
            })
        })
    }

}