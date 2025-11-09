import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/environment';

interface JwtPayload {
  id: string;
}

export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, config.jwt.secret, { 
    expiresIn: config.jwt.expire 
  } as SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ id: userId }, config.jwt.refreshSecret, { 
    expiresIn: config.jwt.refreshExpire 
  } as SignOptions);
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
};




