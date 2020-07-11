import { HttpRequest } from "@azure/functions";
import auth = require("basic-auth");

const username = process.env["API_KEY"] || "username";
const password = process.env["API_SECRET"] || "password";

const basicAuth = (req: HttpRequest): boolean => {
  if (!req.headers || !req.headers.authorization) return false;
  const credential = auth(req);
  return username === credential.name && password === credential.pass;
};

export { basicAuth };
