export default function Logo({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.svg"
      width={size}
      height={size}
      alt="뭐무꼬 로고"
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
