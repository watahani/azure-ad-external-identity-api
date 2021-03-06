import { redsValidator } from "../lib/validators";
import { AzureFunction } from "@azure/functions";
import { combineTransformer } from "../lib/b2x";
import { basicAuth } from "../lib/auth";

const httpTrigger: AzureFunction = combineTransformer(
  [redsValidator],
  basicAuth
);

export default httpTrigger;
