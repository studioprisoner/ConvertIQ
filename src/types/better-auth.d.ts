declare module "better-auth" {
  interface User {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  }
}

declare module "better-auth/types" {
  interface User {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  }
}