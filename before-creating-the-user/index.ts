import { redsValidator } from "../lib/validators";
import { AzureFunction } from "@azure/functions";
import { combineTransformer } from "../lib/b2c";

const httpTrigger: AzureFunction = combineTransformer([redsValidator]);

export default httpTrigger;
