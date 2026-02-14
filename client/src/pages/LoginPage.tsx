import { useAuth } from '../context/AuthContext';
import { Heading, Text } from '../ui';
import OAuthButton from '../components/OAuthButton';

const DiscordIcon = () => (
  <svg width="28" height="22" viewBox="0 0 71 55" fill="none">
    <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.8 58.8 0 0017.7 9a.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.3.1 58.6 58.6 0 0017.7-9v-.1c1.4-15-2.3-28.4-9.8-40.1a.2.2 0 00-.1-.1zM23.7 37.3c-3.5 0-6.3-3.2-6.3-7s2.8-7 6.3-7 6.4 3.2 6.3 7-2.8 7-6.3 7zm23.2 0c-3.5 0-6.3-3.2-6.3-7s2.8-7 6.3-7 6.4 3.2 6.3 7-2.8 7-6.3 7z" fill="white"/>
  </svg>
);

export default function LoginPage() {
  const { enterDemo } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-2.5">
      <div className="relative">
        <div className="absolute inset-0 blur-3xl bg-accent rounded-full scale-150" style={{ opacity: 'var(--opacity-4)' }} />
        <img src="/logo.svg" alt="GuildSpace" className="w-12 h-auto mb-1 relative" />
      </div>
      <Heading level="hero">GuildSpace</Heading>
      <Text variant="secondary" className="mb-4">a place for guilds</Text>
      <OAuthButton
        href="/api/auth/discord"
        icon={<DiscordIcon />}
        label="Log in with Discord"
        color="#5865F2"
        hoverColor="#4752C4"
      />
      <button
        onClick={enterDemo}
        className="inline-flex items-center justify-center font-body text-body font-medium text-white py-1.5 px-4 rounded-md transition-colors duration-fast bg-surface-2 hover:bg-surface-3 border-none cursor-pointer w-30"
      >
        Look Around
      </button>
    </div>
  );
}
