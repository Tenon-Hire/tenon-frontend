import Button from '@/shared/ui/Button';
import { StateMessage } from '../components/StateMessage';

type Props = { loginHref: string; message: string | null };

export function AuthView({ loginHref, message }: Props) {
  return (
    <StateMessage
      title="Sign in to continue"
      description={message ?? 'Redirecting you to sign in.'}
      action={
        <a href={loginHref}>
          <Button>Continue to sign in</Button>
        </a>
      }
    />
  );
}
