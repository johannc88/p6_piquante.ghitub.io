require('dotenv').config()
const express = require("express")
const app = express()
const cors = require("cors")
const port = 3000

//connection database
require('./mongo')

//controllers
const {createUser, logUser} = require("./controllers/user")

//middleware
app.use(cors())
app.use(express.json())

//route
app.post("/api/auth/signup", createUser)
app.post("/api/auth/login", logUser)
app.get('/', (req, res) => res.send("hello world"))

//listen
app.listen(port, () => console.log('listening on port + 3000'))

