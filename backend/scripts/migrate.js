require('dotenv').config({ path: '../.env' }); // Adjust path as scripts are in backend/scripts
const { sequelize } = require('../models');

async function migrate() {
    try {
        console.log('Starting migration...');
        await sequelize.authenticate();
        console.log('Database connected.');
        await sequelize.sync({ force: true });
        console.log('Database synchronized successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
