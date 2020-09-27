import { HttpRequest } from "@azure/functions";
import auth = require("basic-auth");

const username = process.env["BASIC_AUTH_USERNAME"] || "username";
const password = process.env["BASIC_AUTH_PASSWORD"] || "password";

export interface Authenticate {
  (req: HttpRequest): boolean;
}

export const basicAuth: Authenticate = (req: HttpRequest): boolean => {
  if (!req.headers || !req.headers.authorization) return false;
  const credential = auth(req);
  return username === credential.name && password === credential.pass;
};
