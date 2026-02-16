interface ItemIconProps {
  iconId: number | null;
  size?: number;
  className?: string;
}

export default function ItemIcon({ iconId, size = 20, className = '' }: ItemIconProps) {
  const src = `/icons/Item_${iconId ?? 0}.png`;

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={`pixelated shrink-0 ${className}`}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.endsWith('Item_0.png')) {
          img.src = '/icons/Item_0.png';
        }
      }}
    />
  );
}
