import { User, UserTgId } from "./user.js";


type DeedTypes = [ "text" | "photo" | "video" | "document"]

interface Deed {
    id: string;
    upvotes: number;
    downvotes: number;
    isValidated: boolean;
    description?: string;
    type?: DeedTypes;
    creator?: UserTgId;
    // votes?: Vote[];
}

interface UserWithDeeds extends User {
    deeds?: Deed[];
}

export {
    DeedTypes,
    Deed,
    UserWithDeeds
}