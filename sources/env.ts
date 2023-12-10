import dotenv from "dotenv";

dotenv.config()

interface ENV {
    // Environment
    IS_PRODUCTION:                  boolean | undefined;
    GROUP_ID:                       number | undefined;
    GROUP_ID_DEV:                   number | undefined;
    BOT_TOKEN:                      string | undefined;
    BOT_TOKEN_DEV:                  string | undefined;

    START_KARMA:                    number | undefined;

    // Votings
    VOTES_FOR_APPROVE:              number | undefined;
    KARMA_FOR_GOOD_DEED:            number | undefined;
    KARMA_FOR_GOOD_DEED_FAILED:     number | undefined;
    KARMA_BY_USER_VOTING:           number | undefined;
    KARMA_BY_USER_VOTING_FAILED:    number | undefined;
    KARMA_KOEF_FOR_VOTERS:          number | undefined;
    
    // The tag of Goodness
    KARMA_FOR_TAG:                  number | undefined;
}

interface SanitizedEnv {
    IS_PRODUCTION:                  boolean;

    // Credentials
    BOT_TOKEN:                      string;
    BOT_TOKEN_DEV:                  string;
    GROUP_ID:                       number;
    GROUP_ID_DEV:                   number;
    START_KARMA:                    number;
    
    // Votings
    VOTES_FOR_APPROVE:              number;
    KARMA_FOR_GOOD_DEED:            number;
    KARMA_FOR_GOOD_DEED_FAILED:     number;
    KARMA_BY_USER_VOTING:           number;
    KARMA_BY_USER_VOTING_FAILED:    number;
    KARMA_KOEF_FOR_VOTERS:          number;

    // The tag of Goodness
    KARMA_FOR_TAG:                  number;
}

const getEnv = (): ENV => {
  let isProd = undefined
  if (process.env.IS_PRODUCTION) {
    isProd = process.env.IS_PRODUCTION.toLowerCase() === 'true' ? true : false
  }

  return {
    // Environment
    IS_PRODUCTION: isProd,

    // Credentials
    BOT_TOKEN: process.env.BOT_TOKEN ? String(process.env.BOT_TOKEN) : undefined,
    BOT_TOKEN_DEV: process.env.BOT_TOKEN_DEV ? String(process.env.BOT_TOKEN_DEV) : undefined,
    GROUP_ID: process.env.GROUP_ID ? Number(process.env.GROUP_ID) : undefined,
    GROUP_ID_DEV: process.env.GROUP_ID_DEV ? Number(process.env.GROUP_ID_DEV) : undefined,

    START_KARMA: process.env.START_KARMA ? Number(process.env.START_KARMA) : undefined,

    // Votings
    VOTES_FOR_APPROVE: process.env.VOTES_FOR_APPROVE ? Number(process.env.VOTES_FOR_APPROVE) : undefined,
    KARMA_FOR_GOOD_DEED: process.env.KARMA_FOR_GOOD_DEED ? Number(process.env.KARMA_FOR_GOOD_DEED) : undefined,
    KARMA_FOR_GOOD_DEED_FAILED: process.env.KARMA_FOR_GOOD_DEED_FAILED ? Number(process.env.KARMA_FOR_GOOD_DEED_FAILED) : undefined,
    KARMA_BY_USER_VOTING: process.env.KARMA_BY_USER_VOTING ? Number(process.env.KARMA_BY_USER_VOTING) : undefined,
    KARMA_BY_USER_VOTING_FAILED: process.env.KARMA_BY_USER_VOTING_FAILED ? Number(process.env.KARMA_BY_USER_VOTING_FAILED) : undefined,
    KARMA_KOEF_FOR_VOTERS: process.env.KARMA_KOEF_FOR_VOTERS ? Number(process.env.KARMA_KOEF_FOR_VOTERS) : undefined,
    
    // The tag of Goodness
    KARMA_FOR_TAG: process.env.KARMA_FOR_TAG ? Number(process.env.KARMA_FOR_TAG) : undefined,
  };
};

const getSanitzedEnv = (config: ENV): SanitizedEnv => {
  console.log(`ENV config:`)
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) {
      throw new Error(`Missing key ${key} in config.env`);
    }
    console.log(`${key} = ${value}`)
  }
  return config as SanitizedEnv;
};

const config = getEnv();

const sanitizedConfig = getSanitzedEnv(config);

export default sanitizedConfig;