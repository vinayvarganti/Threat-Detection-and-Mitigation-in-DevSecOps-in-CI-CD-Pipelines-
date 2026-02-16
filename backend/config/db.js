const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);

        logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        console.error(error); // Log full error to console
        logger.error(error.stack);
        process.exit(1);
    }
};

module.exports = connectDB;
