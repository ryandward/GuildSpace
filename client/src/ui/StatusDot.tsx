import { cx } from 'class-variance-authority';
import { statusDot, type StatusDotVariants } from './recipes';

type Props = StatusDotVariants & { className?: string };

export default function StatusDot({ status, size, className }: Props) {
  return <span className={cx(statusDot({ status, size }), className)} />;
}
