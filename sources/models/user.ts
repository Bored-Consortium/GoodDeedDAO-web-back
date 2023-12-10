
type UserTgId = number

enum UserRole {
    validator,
    creator,
    admin
}

interface User {
    id: UserTgId;
    username?: string;
    karma?: number;
    validations?: number;
    // votes?: Vote[];
    role?: UserRole;
}

export {
    User,
    UserTgId,
    UserRole,
}