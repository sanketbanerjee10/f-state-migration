export function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'rgba(15,23,42,0.75)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '18px 20px',
        marginBottom: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
