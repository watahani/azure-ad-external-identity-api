import { ClaimTransformer, B2CValidationError, EXTENSION_APP_ID } from "./b2c";

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
    throw new B2CValidationError(
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

export const mailDomainValidator = new ClaimTransformer(
  (claims) => {
    const allowedDomains = ["microsoft.com", "whdv.onmicrosoft.com"];
    const domain = claims.email.split("@").pop();
    if (!allowedDomains.includes(domain)) {
      throw new B2CValidationError(
        `Your domain ${domain} is not allowed`,
        "Error0000",
        "ShowBlockPage",
        "error"
      );
    }
    return Promise.resolve(claims);
  },
  { continueOnError: false }
);
