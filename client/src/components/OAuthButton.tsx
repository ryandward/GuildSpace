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
      className="inline-flex items-center gap-3 font-sans text-base font-medium text-white no-underline py-3.5 px-8 rounded-lg transition-colors duration-200"
      style={{ backgroundColor: color }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverColor)}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = color)}
    >
      {icon}
      {label}
    </a>
  );
}
