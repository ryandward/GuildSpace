interface OAuthButtonProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  hoverColor: string;
}

export default function OAuthButton({ href, icon, label, color, hoverColor }: OAuthButtonProps) {
  return (
    <a
      href={href}
      className="flex items-center justify-center gap-1.5 font-body text-body font-medium text-white no-underline py-1.5 px-4 rounded-md transition-colors duration-fast whitespace-nowrap"
      style={{ backgroundColor: color }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverColor)}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = color)}
    >
      {icon}
      {label}
    </a>
  );
}
