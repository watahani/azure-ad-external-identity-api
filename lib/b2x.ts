import { AzureFunction, HttpRequest, Context } from "@azure/functions";
import { Authenticate } from "./auth";

export const API_VERSION = process.env["API_VERSION"] || "1.0.0";
export const EXTENSION_APP_ID =
  process.env["EXTENSION_APP_ID"] || "6b24c143de614292ac183d26cb965604"; // sample value

export class B2XValidationError extends Error {
  response: B2XResponse;
  innerError: Error;
  constructor(
    userMessage: string,
    code: string,
    action: "ShowBlockPage" | "ValidationError",
    message?: string,
    innerError?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    this.innerError = innerError;
    this.response = {
      headers: {
        "Content-Type": "application/json",
      },
      status: action === "ValidationError" ? 400 : 200,
      body: {
        version: API_VERSION,
        action: action,
        userMessage: userMessage,
        code: code,
        status: action === "ValidationError" ? 400 : null,
      },
    };
  }
}

export type B2XAction = "Continue" | "ShowBlockPage" | "ValidationError";

export interface B2XResponse {
  headers: {
    "Content-Type": "application/json";
  };
  status: 200 | 400;
  body: {
    version: string;
    action: B2XAction;
    userMessage?: string;
    code?: string;
    status?: number;
  };
}

interface TransFormerOptions {
  errorCode?: string;
  errorMessage?: string;
  userMessage?: string;
  continueOnError: boolean;
}

interface Transformer {
  (claims: { [key: string]: string }): Promise<{ [key: string]: string }>;
}
export class ClaimTransformer {
  name: string;
  options: TransFormerOptions;
  error: B2XValidationError;
  transformer: Transformer;
  constructor(transformer: Transformer, options: TransFormerOptions) {
    this.name = this.constructor.name;
    this.options = options;
    this.transformer = transformer;
  }
  /**
   * transform claims
   * throw B2X Validation Error if failed
   */
  public transform(claims: {
    [key: string]: string;
  }): Promise<{ [key: string]: string }> {
    try {
      return this.transformer(claims);
    } catch (error) {
      // if validator throw B2XValidateError throw it over.
      if (error instanceof B2XValidationError) {
        throw error;
      } else {
        throw new B2XValidationError(
          this.options.userMessage,
          this.options.errorCode,
          "ShowBlockPage",
          `failed [${this.name}]: ${this.options.errorMessage}`,
          error
        );
      }
    }
  }
}

export class HttpResponder {
  transformers: Array<ClaimTransformer>;
  auth?: Authenticate;
  /**
   * addAuth
   */
  public addAuth(auth: Authenticate): HttpResponder {
    this.auth = auth;
    return this;
  }
  /**
   * addTransformers
transformers:    */
  public addTransformers(transformers: Array<ClaimTransformer>): HttpResponder {
    this.transformers = transformers;
    return this;
  }

  /**
   * httpTrigger
   */
  public httpTrigger(): AzureFunction {
    return async function (context: Context, req: HttpRequest): Promise<void> {
      context.log("HTTP trigger function processed a request.");

      if (this.auth && !this.auth(req)) {
        context.log.error("Authentication Failed");
        context.res = new B2XValidationError(
          "Internal Server Error. Please Contact administrator. [Basic Auth Error]",
          "BASIC-AUTH-ERROR",
          "ShowBlockPage",
          null
        ).response;
        return;
      }

      const transformerNames = this.transformers.map((f) => f.name);
      context.log(`Applied transformers are ${transformerNames}`);

      const claims = req.body;

      context.log("receive claims", claims);

      let res: B2XResponse;
      try {
        res = await transformerChain(claims, this.transformers);
      } catch (error) {
        if (error instanceof B2XValidationError) {
          context.log(error);
          res = error.response;
        } else {
          context.log(error);
        }
      }

      context.log("response sent", res);

      context.res = res;
    };
  }
}

export const combineTransformer = (
  transformers: Array<ClaimTransformer>,
  auth?: Authenticate
): AzureFunction => {
  return async function (context: Context, req: HttpRequest): Promise<void> {
    context.log("HTTP trigger function processed a request.");

    if (auth && !auth(req)) {
      context.log.error("Authentication Failed");
      context.res = new B2XValidationError(
        "Internal Server Error. Please Contact administrator. [Basic Auth Error]",
        "BASIC-AUTH-ERROR",
        "ShowBlockPage",
        null
      ).response;
      return;
    }

    const transformerNames = transformers.map((f) => f.name);
    context.log(`Applied transformers are ${transformerNames}`);

    const claims = req.body;

    context.log("receive claims", claims);

    let res: B2XResponse;
    try {
      res = await transformerChain(claims, transformers);
    } catch (error) {
      if (error instanceof B2XValidationError) {
        context.log(error);
        res = error.response;
      } else {
        context.log(error);
      }
    }

    context.log("response sent", res);

    context.res = res;
  };
};

const transformerChain = async (
  claims: { [key: string]: string },
  transformers: Array<ClaimTransformer>
): Promise<B2XResponse> => {
  const output = await transformers.reduce(async (prev, cur) => {
    try {
      const claims = await prev;
      return cur.transformer(claims);
    } catch (error) {
      // continue if continueOnError is set true
      if (cur.options.continueOnError) {
        return claims;
      }
      throw error;
    }
  }, Promise.resolve(claims));
  return claimToB2XResponse(output);
};

export const claimToB2XResponse = (claims: {
  [key: string]: string;
}): B2XResponse => {
  return {
    headers: {
      "Content-Type": "application/json",
    },
    status: 200,
    body: {
      version: API_VERSION,
      action: "Continue",
      ...claims,
    },
  };
};
