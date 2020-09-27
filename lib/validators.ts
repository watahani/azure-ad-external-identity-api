import { ClaimTransformer, B2XValidationError, EXTENSION_APP_ID } from "./b2x";

export const nameValidator = new ClaimTransformer(
  (claims) => {
    return Promise.resolve(claims);
  },
  {
    continueOnError: true,
  }
);

export const redsValidator = new ClaimTransformer(
  (claims) => {
    if (claims[`extension_${EXTENSION_APP_ID}_We_Are_Reds`]) {
      claims.displayName = "[Reds]" + claims.displayName;
      return Promise.resolve(claims);
    }
    throw new B2XValidationError(
      "Reds じゃないとだめよ",
      "WAR001",
      "ShowBlockPage",
      "user does not select WE ARE REDS"
    );
  },
  {
    continueOnError: false,
  }
);

export class MailDomainValidator extends ClaimTransformer {
  constructor(allowedDomains: Array<string>) {
    const transformer = (claims) => {
      const domain = claims?.email?.split("@").pop();
      if (!allowedDomains.includes(domain)) {
        throw new B2XValidationError(
          `Your domain ${domain} is not allowed`,
          "Error0000",
          "ShowBlockPage",
          "error"
        );
      }
      return Promise.resolve(claims);
    };
    super(transformer, { continueOnError: false });
  }
}
