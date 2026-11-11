// Native providers are implemented in social.native.tsx. The web preview uses email login.
import type { Session } from '@junta/api-client';
export function SocialLogin(_props: {
  accept: (session: Session) => void;
  onError: (message: string) => void;
}) {
  return null;
}
