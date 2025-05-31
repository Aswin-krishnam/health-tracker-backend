const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config(); 

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.DATABASE_URL);

const jwtSecret = process.env.JWT_SECRET_KEY;
console.log(jwtSecret)

app.listen(8080, () => {
  console.log("Server running on port 8080");
});