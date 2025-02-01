import { TelegramUserID, User } from "./types";

export class UserExistsError extends Error {
  name = "UserExistsError";
  user: User;

  constructor(message: string, user: User) {
    super(message); // Pass the message to the parent Error class
    this.user = user;

    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, UserExistsError.prototype);
  }
}

export class TGUserNotFoundError extends Error {
  name = "UserNotFoundError";
  userID: TelegramUserID;

  constructor(message: string, userID: TelegramUserID) {
    super(message); // Pass the message
    this.userID = userID;
  }
}
