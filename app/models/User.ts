// models/User.ts
export interface User {
  uid: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  profilePicture?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}