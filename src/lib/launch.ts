// 15 August launch switch.
// To activate: set VITE_LAUNCH_ACTIVE=true in Vercel environment variables and redeploy.
// No code changes needed on launch day.
export const isLaunched = import.meta.env.VITE_LAUNCH_ACTIVE === 'true'
