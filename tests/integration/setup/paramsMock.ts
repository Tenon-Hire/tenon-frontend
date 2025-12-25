export const paramsMock: Record<string, string> = {};

export function setMockParams(params: Record<string, string>) {
  Object.keys(paramsMock).forEach((key) => delete paramsMock[key]);
  Object.assign(paramsMock, params);
}

jest.mock('next/navigation', () => ({
  useParams: () => paramsMock,
}));
