const moment = require('moment')
const { ObjectId } = require('mongodb')
const { default: mongoose } = require('mongoose')
const uuid = require("uuid")

exports.signIn = (req, res)=>{

    const email = req.body.email
    const password = req.body.password

    const client = require('../../app').client
    const chatDb  = client.db('chatDb')
    const usersDbCollection = chatDb.collection('users')
    
    if(email == "" || email == null || email == undefined || !email.includes("@") || !email.includes(".com")){
        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "email",
                    "message" : "Enter a valid email"
                },
                
            ]
        })
        return
    }else if(password == "" || password == null || password == undefined || password.length < 6){

        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "password",
                    "message" : "Enter a valid password"
                },
                
            ]
        })

        return
    }

    usersDbCollection.findOne({email:email, password: password}).then(result=>{

        if(result == {} || result == undefined || result == null){
            res.status(401).json({
                code: -1,
                key: "authenticationFailed",
                message: "Incorect email or password",
                description: "Ensure that the email or password included in the request are correct"
            })
        }else{
            usersDbCollection.updateOne({email:email, password: password}, {$set:{"is_connected": true, token_firebase:req.body.token_firebase}})

            res.status(200).json({
                data:{
                    user:{
                        _id: result._id,
                        email:result.email,
                        first_name: result.first_name,
                        last_name: result.last_name,
                        photo_url: result.photo_url
                    }
                }
            })
        }

    }).catch(err=>{
        res.status(500).json({
            code: -1,
            key: "serverProblem",
            message: "Server problem",
            description: "Please try later"
        })
    })
}


exports.signUp = (req, res)=>{
 
    const body = req.body
    const client = require('../../app').client
    const chatDb  = client.db('chatDb')
    const usersDbCollection = chatDb.collection('users')


    // email password first and last name


    if (body.email == "" || body.email == undefined  || !body.email.includes("@") || !body.email.includes(".com")){
        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "email",
                    "message" : "Ensure that the email included in the request are correct"
                },
                
            ]
        })
        return
    }
    else if (body.first_name == "" || body.first_name == undefined){
       
        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "first_name",
                    "message" : "Ensure that the first_name included in the request are correct"
                },
                
            ]
        })
        return
    }
    else if (body.last_name == "" || body.last_name == undefined){

        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "last_name",
                    "message" : "Ensure that the last_name included in the request are correct"
                },
                
            ]
        })

        return
    }
    else if (body.password == "" || body.password == undefined){
      
        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "password",
                    "message" : "Ensure that the password included in the request are correct"
                },
                
            ]
        })
        return
    }
    else if (body.password.length < 6){
 
        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "password",
                    "message" : "Password less than 6 chars"
                },
                
            ]
        })

        return
    }


    usersDbCollection.findOne({email:body.email}).then(result=>{

        if(result == {} || result == undefined || result == null){
            const objUser = {
                _id : ObjectId(),
                email : body.email,
                first_name : body.first_name,
                last_name : body.last_name,
                password : body.password,
                is_connected: true,
                at_another_call:false,
                groups: [],
                last_opened: moment().format(),
                photo_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRR3P7UgoWenR_4NjJlHEryCvsGfQ2tclslXvGjudnXJXFOmaL9BBau7279gj_d_mrD6dw&usqp=CAU",
                token_firebase : body.token_firebase
            }

            usersDbCollection.insertOne(objUser).then(resultInsert=>{

                res.status(200).json({
                    data:{
                        user:{
                            _id: objUser._id,
                            email:objUser.email,
                            first_name: objUser.first_name,
                            last_name: objUser.last_name,
                            photo_url: objUser.photo_url,
                            token_firebase : objUser.token_firebase
                        }
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
        }else{
            res.status(401).json({
                "code": -2,
                "key": "validationFailed",
                "errors" : [
                    {
                        "code" : -1,
                        "field" : "email",
                        "message" : "This email assosited by another user, try with another one"
                    },
                ]
            })
        }

    }).catch(err=>{

        res.status(500).json({
            code: -1,
            key: "serverProblem",
            message: "Server problem",
            description: "Please try later"
        })
    
    })
}


exports.userInfo = (req, res)=>{

    const userId = req.params.userId
    const mongodbClient = require('../../app').client
    const chatDb = mongodbClient.db("chatDb")
    const users = chatDb.collection("users")

    if(!mongoose.isValidObjectId(userId)){
        res.status(400).json({
            "code": -2,
            "key": "validationFailed",
            "errors" : [
                {
                    "code" : -1,
                    "field" : "userId",
                    "message" : "userId not valid"
                },
            
            ]
        })
        return
    }


    users.findOne({_id:ObjectId(userId)}).then(userResult=>{
        if(userResult == {} || userResult == null){

            res.status(400).json({
                "code": -2,
                "key": "validationFailed",
                "errors" : [
                    {
                        "code" : -1,
                        "field" : "userId",
                        "message" : "invalid userId"
                    },
                ]
            })
        }else{

            const userBody = {
                _id: userResult._id,
                first_name: userResult.first_name,
                last_name: userResult.last_name,
                is_connected: userResult.is_connected,
                groups: userResult.groups,
                last_opened: userResult.last_opened,
                photo_url: userResult.photo_url,
                at_another_call: userResult.at_another_call
                                
            }

            res.status(200).json({
                data:{
                    user: userBody
                }
            })
        }

        //client.emit("userInfoObject", userResult)
    }).catch(err=>{
        res.status(500).json({
            code: -1,
            key: "serverProblem",
            message: "Server problem",
            description: "Please try later"
        })
    })
    
}


exports.searchUsers = (req, res)=>{

    const query = req.params.query
    
    if(query.length == 0){
        return
    }

    const mongodbClient = require('../../app').client
    const sequence = String(query).toUpperCase()
    const chatDb = mongodbClient.db("chatDb")
    const users = chatDb.collection("users")

    users.find({}).toArray().then(async users=>{
        var listBySequence = []
        for await(const user of users){
            const name = user.first_name.toUpperCase()
        
            const userBody = {
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                is_connected: user.is_connected,
                groups: user.groups,
                last_opened: user.last_opened,
                photo_url: user.photo_url,
                at_another_call:user.at_another_call              
            }

            if(name.includes(sequence)){
                listBySequence.push(userBody)
            }
        }


        res.status(200).json({
            data:{
                users:listBySequence
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