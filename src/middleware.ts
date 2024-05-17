import { AnyZodObject, ZodError } from "zod";
import {
  RequestHandler as Middleware,
  NextFunction,
  Request,
  Response,
} from "express";
import { BadRequestError } from "./error-handler";

export const validateResource =
  (schema: AnyZodObject, comingFrom: string): Middleware =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = schema.parse({
        params: req.params,
        body: req.body,
        query: req.query,
      });
      req.body = data.body;
      req.query = data.query;
      req.params = data.params;

      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const message = error.issues[0].message;
        throw new BadRequestError(message, comingFrom);
      }
      next(error);
    }
  };
