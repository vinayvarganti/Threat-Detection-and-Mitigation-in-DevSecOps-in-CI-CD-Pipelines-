const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 50,
    match: /^[a-zA-Z0-9]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^\S+@\S+\.\S+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // Corresponds to scopes logic in Sequelize
  },
  firstName: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 50
  },
  role: {
    type: String,
    enum: ['admin', 'developer'],
    default: 'developer'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profilePicture: {
    type: String
  },
  githubUsername: {
    type: String
  },
  preferences: {
    type: Object,
    default: {
      notifications: {
        email: true,
        browser: true,
        vulnerabilities: true,
        threats: true
      },
      dashboard: {
        theme: 'light',
        autoRefresh: true
      }
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Pre-save hook to hash password
// Pre-save hook to hash password
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 12);
});

// Method to validate password
UserSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);