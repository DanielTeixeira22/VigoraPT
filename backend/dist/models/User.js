"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const UserProfileSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    bio: { type: String },
}, { _id: false });
const UserSchema = new mongoose_1.Schema({
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true }, // guarda hash, nunca plain text
    role: {
        type: String,
        enum: ['ADMIN', 'TRAINER', 'CLIENT'],
        required: true,
        index: true
    },
    profile: { type: UserProfileSchema, required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
// pesquisa rápida por nome/apelido/username
UserSchema.index({
    'profile.firstName': 'text',
    'profile.lastName': 'text',
    username: 'text',
});
const UserModel = (0, mongoose_1.model)('User', UserSchema);
exports.default = UserModel;
