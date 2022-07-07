
const express = require("express");
const { MongoClient } = require("mongodb");
const app = express()
const http = require('http').Server(app);
const io = require('socket.io')(http);
const mongodb = require('mongodb').MongoClient
const socketF = require('./src/Socket.io/Socket.io')
const config = require('dotenv')
var admin = require("firebase-admin");

config.config()

const mongodbClient = new MongoClient("mongodb://aissamelboudi:aissamelboudi@ac-a0hfmdm-shard-00-00.f34o72o.mongodb.net:27017,ac-a0hfmdm-shard-00-01.f34o72o.mongodb.net:27017,ac-a0hfmdm-shard-00-02.f34o72o.mongodb.net:27017/?ssl=true&replicaSet=atlas-vwd9ov-shard-0&authSource=admin&retryWrites=true&w=majority")

app.use(express.json())
app.use(express.urlencoded())

mongodbClient.connect().then(result=>{
    console.log('connected')
    exports.client = result
}).catch(err=>{
    console.log('errrrrr--------'+err)
})

////////////////////////////////////////////
//peerjs
var ExpressPeerServer = require('peer').ExpressPeerServer;
var options = {
    debug: true
}

// peerjs is the path that the peerjs server will be connected to.
app.use('/api/v1/peerjs', ExpressPeerServer(http, options));




var serviceAccount = require("./aji-creative-firebase-adminsdk-pda2z-294463c310.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

app.get("/", (req,res)=>{
    res.send("heelo")
})
app.use('/api/v1', require('./src/routes/routes'))


// socket process
///////////////////////////////////////////////////////
io.on('connection', client => {
    

    exports.fcm = admin

    exports.SocketIO = client
    exports.IO = io

    ////////////////////////////////////////////////////////////
    socketF.joinChatRoom(client)

    ////////////////////////////////////////////////////////////
    socketF.joinChat(client, io, mongodbClient)

    ////////////////////////////////////////////////////////////
    socketF.userIsTyping(client, io, mongodbClient)

    ////////////////////////////////////////////////////////////
    socketF.leaveChatRoom(client)

    ////////////////////////////////////////////////////////////
    socketF.logOut(client, io, mongodbClient)

    ////////////////////////////////////////////////////////////
    socketF.callOther(client, io)

    ///////////////////////////////////////////////////////////
    socketF.answerOther(client, io)

    ///////////////////////////////////////////////////////////
    socketF.endCall(client, io)

    


});


http.listen(3000, function() {
    console.log('listening on *:3000');
 });