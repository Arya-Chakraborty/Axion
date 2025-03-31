const mongoose = require('mongoose')

require('dotenv').config();
const connectToDB = () => {
    mongoose.connect(process.env.MONGODB_DATABASE_URL)
    .then(() => {
        console.log("DB connection is successful");
    }).catch((error) => {
        console.log(`Error: ${error.message}`);
        process.exit(1);
    })
}

module.exports = connectToDB;