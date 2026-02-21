export const publicUserSelect = {
  id: true,
  siiauCode: true,
  displayName: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type PublicUser = {
  id: string;
  siiauCode: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type JwtPayload = {
  sub: string;
  siiauCode: string;
  iat?: number;
  exp?: number;
};
