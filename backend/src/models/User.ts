import { Schema, model, Model, HydratedDocument } from 'mongoose';

export type UserRole = 'ADMIN' | 'TRAINER' | 'CLIENT';

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  bio?: string;
}

export interface User {
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  profile: UserProfile;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const UserProfileSchema = new Schema<UserProfile>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    bio:       { type: String },
  },
  { _id: false }
);

const UserSchema = new Schema<User>(
  {
    username:     { type: String, required: true, unique: true, index: true },
    email:        { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true }, // guarda hash, nunca plain text
    role:         {
      type: String,
      enum: ['ADMIN', 'TRAINER', 'CLIENT'],
      required: true,
      index: true
    },
    profile:      { type: UserProfileSchema, required: true },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

// pesquisa rápida por nome/apelido/username
UserSchema.index({
  'profile.firstName': 'text',
  'profile.lastName' : 'text',
  username           : 'text',
});

const UserModel: Model<User> = model<User>('User', UserSchema);

export default UserModel;
