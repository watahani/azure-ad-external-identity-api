import { AzureFunction } from "@azure/functions";
import { combineTransformer } from "../lib/b2c";
import { mailDomainValidator } from "../lib/validators";

const httpTrigger: AzureFunction = combineTransformer([
  mailDomainValidator,
]);

export default httpTrigger;
