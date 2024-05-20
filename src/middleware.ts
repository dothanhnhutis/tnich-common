import { AnyZodObject, ZodError } from "zod";
import {
  RequestHandler as Middleware,
  NextFunction,
  Request,
  Response,
} from "express";
import { BadRequestError, NotAuthorizedError } from "./error-handler";
import { verifyJWT } from "./helper";

export type GatewayRequestType = "auth" | "post" | "product";

const tokens: GatewayRequestType[] = ["auth", "post", "product"];

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

export const verifyGatewayRequest =
  (secret: string): Middleware =>
  (req, res, next) => {
    if (!req.headers?.gatewaytoken) {
      throw new NotAuthorizedError(
        "Invalid request",
        "verifyGatewayRequest() method: Request not coming from api gateway"
      );
    }
    const token: string = req.headers?.gatewaytoken as string;
    if (!token) {
      throw new NotAuthorizedError(
        "Invalid request",
        "verifyGatewayRequest() method: Request not coming from api gateway"
      );
    }
    try {
      const payload = verifyJWT<{ id: GatewayRequestType; iat: number }>(
        token,
        secret
      );
      if (!payload || !tokens.includes(payload.id)) {
        throw new NotAuthorizedError(
          "Invalid request",
          "verifyGatewayRequest() method: Request payload is invalid"
        );
      }
    } catch (error) {
      throw new NotAuthorizedError(
        "Invalid request",
        "verifyGatewayRequest() method: Request not coming from api gateway"
      );
    }
    next();
  };
