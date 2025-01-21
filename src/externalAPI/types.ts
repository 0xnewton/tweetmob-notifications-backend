import { User } from "../users/types";
import { Request, Response, NextFunction } from "express";

export interface APIRequest extends Request {
  user?: User;
}

export type APIResponse = Response;
export type APINextFunction = NextFunction;
