const mongoose = require("mongoose")
const { unlink } = require("fs/promises")
const res = require("express/lib/response")

const productSchema = new mongoose.Schema({
  userId: String,
  name: String,
  manufacturer: String,
  description: String,
  mainPepper: String,
  imageUrl: String,
  heat: { type: Number, min: 1, max: 5 },
  likes: Number,
  dislikes: Number,
  usersLiked: [String],
  usersDisliked: [String]
})
const Product = mongoose.model("Product", productSchema)

function getSauces(req, res) {
  Product.find({})
    .then((products) => res.send(products))
    .catch((error) => res.status(500).send(error))
}

function getSauce(req, res) {
  const { id } = req.params
  return Product.findById(id)
}

 function getSauceById(req, res) {
  getSauce(req, res)
  .then(product => sendClientResponse(product, res))
  .catch((err) => res.status(500).send(err))
}

function deleteSauce(req, res) {
    const { id } = req.params
    Product.findByIdAndDelete(id)
    .then((product) => sendClientResponse(product, res))
    .then((item) => deleteImage(item))
    .then((res)=> console.log("FILE DELETED", res))
    .catch((err) => res.status(500).send({message: err}))
}

function deleteImage(product) {
    const { imageUrl } = product
    const imageToDelete = imageUrl.split("/").at(-1)
    return unlink("images/" + imageToDelete)
    
}

function makeImageUrl(req, fileName) {
  return req.protocol + "://" + req.get("host") + "/images/" + fileName
}

function modifySauce(req, res) {
  const {params: { id }} = req
  
  const hasNewImage = req.file !=null
  const payload = makePayload(hasNewImage, req)
  
  Product.findByIdAndUpdate(id, payload)
  .then((dbResponse) => sendClientResponse(dbResponse, res))
  .then((product) => deleteImage(product))
  .then((res)=> console.log("FILE DELETED", res))
  .catch((err) => console.error("Probleme updating", err))
}

function makePayload(hasNewImage, req) {
  console.log("hasNewImage:",hasNewImage )
  if(!hasNewImage) return req.body
  const payload = JSON.parse(req.body.sauce)
  payload.imageUrl = makeImageUrl(req, req.file.fileName)
  console.log("NOUVELLE IMAGE A GERER")
  console.log("voici le payload:" , req.body.sauce)
  return payload
}

function sendClientResponse (product , res) {
    if(product == null ) {
      console.log("NOTHING TO UPDATE")
      return res.status(404).send({ message: "object not found in database"})
    }
    console.log("ALL GOOD, UPDATING:", product)
    return Promise.resolve(res.status(200).send(product)).then(()=>product)

}

function createSauce(req, res) {
  const { body, file } = req
  const { fileName } = file
  const sauce = JSON.parse(body.sauce)
  const { name, manufacturer, description, mainPepper, heat, userId } = sauce

  const product = new Product({
    userId: userId,
    name: name,
    manufacturer: manufacturer,
    description: description,
    mainPepper: mainPepper,
    imageUrl: makeImageUrl(req, fileName),
    heat: heat,
    likes: 0,
    dislikes: 0,
    usersLiked: [],
    usersDisliked: []
  })
  product
    .save()
    .then((message) => res.status(201).send({ message }))
    .catch((err) => res.status(500).send({ message: err}))
}

function likeSauce (req, res) {
  const { like, userId } = req.body
  if(![0, -1, 1].includes(like)) return res.status(403).send({message: "invalid like value"})

  getSauce(req, res)
  .then((product) => updateVote(product, like, userId, res))
  .then(prod => sendClientResponse(prod, res))
  .catch((err) => res.status(500).send(err))
}

function updateVote(product, like, userId, res){
  if (like === 1 || like === -1) incrementVote(product, like, userId)
  if (like === 0) resetVote(product, userId, res)
  return product.save()
}

function resetVote(product, userId, res) {
  const { usersLiked, usersDisliked } = product
  if([usersLiked, usersDisliked].every(arr => arr.includes(userId))) return res.status(500).send({message: "l'utilisateur a voter les 2 pouces" })
  //if (![usersLiked, usersDisliked].some(arr => arr.includes(userId))) return res.status(500).send({message: "l'utilisateur n'a pas voter"})

 

}

function incrementVote(product, userId , like) {
  const { usersLiked, usersDisliked } = product

  const votersArray = like === 1 ? usersLiked : usersDisliked
  if (votersArray.includes(userId)) return
  votersArray.push(userId)
  
  let voteToUpdate = like === 1 ? product.likes : product.dislikes
  voteToUpdate++
}


module.exports = {  getSauces, createSauce , getSauceById, deleteSauce, modifySauce, likeSauce}