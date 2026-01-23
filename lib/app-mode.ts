export function isSelfHostedMode(): boolean {
  return process.env.NEXT_PUBLIC_APP_MODE !== "valyu";
}

export function isValyuMode(): boolean {
  return process.env.NEXT_PUBLIC_APP_MODE === "valyu";
}
