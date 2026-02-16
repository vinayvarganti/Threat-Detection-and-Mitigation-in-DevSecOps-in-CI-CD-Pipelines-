require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('../models/Project'); // Adjust path as needed

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const listProjects = async () => {
    await connectDB();
    const projects = await Project.find({});
    console.log('--- Projects List ---');
    projects.forEach(p => {
        console.log(`ID: ${p._id}, Name: ${p.name}, Repo: ${p.repositoryUrl}, User: ${p.userId}`);
    });
    console.log('---------------------');
    process.exit(0);
};

listProjects();
