const express = require('express')
const router = express.Router()
const AWS = require('aws-sdk')
const bodyParser = require('body-parser')
const div = require('dotenv')
div.config()

router.use(bodyParser.json())
router.use(bodyParser.urlencoded({extended: true}))

const access_key_id = process.env.ACCESS_KEY_ID
const secret_access_key = process.env.SECRET_ACCESS_KEY

AWS.config.update({
    accessKeyId: access_key_id,
    secretAccessKey: secret_access_key,
    region: 'eu-west-3'})

const S3 = new AWS.S3({apiVersion: '2006-03-01'})

exports.getAudioBuffer = async (req, res)=>{

    

    S3.getObject({
        Bucket: 'ajicreativeaudio',
        Key : req.params.id
    }, (err, data)=>{
        if(err){
            res.status(500).send({})
        }else{
            if(data.Body != null){
                res.status(200).send(data.Body)
            }
        }
    })
}


exports.getVideoBuffer = async (req, res)=>{

    S3.getObject({
        Bucket: 'ajicreativevideos',
        Key : req.params.id
    }, (err, data)=>{
        if(err){
            res.status(500).send({})
        }else{
            if(data.Body != null){
                res.status(200).send(data.Body)
            }
        }
    })
}


exports.getImageBuffer = async (req, res)=>{

    S3.getObject({
        Bucket: 'ajicreativeimages',
        Key : req.params.id
    }, (err, data)=>{
        if(err){
            res.status(500).send({})
            console.log(err)
            console.log(req.params.id)
        }else{
            if(data.Body != null){
                res.status(200).send(data.Body)
            }
        }
    })
}

