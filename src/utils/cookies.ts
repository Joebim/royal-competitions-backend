import { Response } from 'express';
import { config } from '../config/environment';

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie('authToken', token, {
    httpOnly: config.cookies.httpOnly,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
    maxAge: config.cookies.maxAge,
  });
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie('authToken', {
    httpOnly: config.cookies.httpOnly,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
  });
};

export const setRefreshCookie = (res: Response, refreshToken: string): void => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: config.cookies.httpOnly,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
    maxAge: config.cookies.maxAge * 4, // Refresh token lasts 4x longer than access token
  });
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie('refreshToken', {
    httpOnly: config.cookies.httpOnly,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
  });
};
