import { AzureFunction, HttpRequest, Context } from "@azure/functions";

export const API_VERSION = "1.0.0";
export const EXTENSION_APP_ID = "6b24c143de614292ac183d26cb965604";

export class B2CValidationError extends Error {
  response: B2CResponse;
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

export type B2CAction = "Continue" | "ShowBlockPage" | "ValidationError";

export interface B2CResponse {
  headers: {
    "Content-Type": "application/json";
  };
  status: 200 | 400;
  body: {
    version: string;
    action: B2CAction;
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
  error: B2CValidationError;
  transformer: Transformer;
  constructor(transformer: Transformer, options: TransFormerOptions) {
    this.name = this.constructor.name;
    this.options = options;
    this.transformer = transformer;
  }
  /**
   * transform claims
   * throw B2C Validation Error if failed
   */
  public transform(claims: {
    [key: string]: string;
  }): Promise<{ [key: string]: string }> {
    try {
      return this.transformer(claims);
    } catch (error) {
      // if valaidator throw B2CValidateError throw it over.
      if (error instanceof B2CValidationError) {
        throw error;
      } else {
        throw new B2CValidationError(
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

export const combineTransformer = (
  transformers: Array<ClaimTransformer>
): AzureFunction => {
  return async function (context: Context, req: HttpRequest): Promise<void> {
    context.log("HTTP trigger function processed a request.");
    const transformerNames = transformers.map((f) => f.name);
    context.log(`Applied transformers are ${transformerNames}`);

    const claims = req.body;

    context.log("receive claims", claims);

    let res: B2CResponse;
    try {
      res = await transformerChain(claims, transformers);
    } catch (error) {
      if (error instanceof B2CValidationError) {
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

export const transformerChain = async (
  claims: { [key: string]: string },
  transformers: Array<ClaimTransformer>
): Promise<B2CResponse> => {
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
  return claimToB2CResponse(output);
};

export const claimToB2CResponse = (claims: {
  [key: string]: string;
}): B2CResponse => {
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
