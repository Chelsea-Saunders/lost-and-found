const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    githubId: {
      type: String,
      unique: true,
      sparse: true,
    },
    role: {
        type: String, 
        enum: ['user', 'admin'],
        default: 'user'
    },
}, {
    timestamp: true
});

// store/verify users passwords when logging in 
UserSchema.pre('save', async function () {
    if(!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
    if(!this.password) return false;

    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);