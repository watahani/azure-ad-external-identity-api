import { AzureFunction } from "@azure/functions";
import { combineTransformer } from "../lib/b2x";
import { MailDomainValidator } from "../lib/validators";
import { basicAuth } from "../lib/auth";

const mailDomainValidator = new MailDomainValidator([
  "microsoft.com",
  "whdv.onmicrosoft.com",
  "wahaniya.com",
  "wahaniya.onmicrosoft.com",
]);

const httpTrigger: AzureFunction = combineTransformer(
  [mailDomainValidator],
  basicAuth
);

export default httpTrigger;
