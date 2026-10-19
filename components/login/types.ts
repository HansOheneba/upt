export type Slide = {
  id: string;
  imageSrc: string;
  headline: string;
  subline: string;
};

export type AuthStep = "email" | "otp";

export type AuthMode = "signup" | "login";
