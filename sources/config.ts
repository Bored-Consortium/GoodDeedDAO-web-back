import env from "./env.js";

interface Config {
    // Depend on environment
    GROUP_ID:   number;
    BOT_TOKEN:  string;

    // Don't depend on environment
    START_KARMA:                number;
    VOTES_FOR_APPROVE:          number;
    KARMA_FOR_GOOD_DEED:        number;
    KARMA_FOR_GOOD_DEED_FAILED: number;
    KARMA_BY_USER_VOTING:       number;
    KARMA_BY_USER_VOTING_FAILED: number;
    KARMA_KOEF_FOR_VOTERS:      number;
    
    // The tag of Goodness
    KARMA_FOR_TAG:  number;
}

const getEnvConfig = (): Config => {
    const groupId = env.IS_PRODUCTION ? env.GROUP_ID : env.GROUP_ID_DEV 
    const botToken = env.IS_PRODUCTION ? env.BOT_TOKEN : env.BOT_TOKEN_DEV 
    console.log(`Using: groupId=${groupId}, botToken=${botToken}`)

    return {
        GROUP_ID: groupId,
        BOT_TOKEN: botToken,
        START_KARMA: env.START_KARMA,
        VOTES_FOR_APPROVE: env.VOTES_FOR_APPROVE,
        KARMA_FOR_GOOD_DEED: env.KARMA_FOR_GOOD_DEED,
        KARMA_FOR_GOOD_DEED_FAILED: env.KARMA_FOR_GOOD_DEED_FAILED,
        KARMA_BY_USER_VOTING: env.KARMA_BY_USER_VOTING,
        KARMA_BY_USER_VOTING_FAILED: env.KARMA_BY_USER_VOTING_FAILED,
        KARMA_KOEF_FOR_VOTERS: env.KARMA_KOEF_FOR_VOTERS,
        KARMA_FOR_TAG: env.KARMA_FOR_TAG
    }
}

const config = getEnvConfig();

export default config;