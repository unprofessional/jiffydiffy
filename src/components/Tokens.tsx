// src/components/Tokens.tsx
export function Tokens({
  tokens,
}: {
  tokens?: Array<{ t: string; del?: boolean; ins?: boolean }>;
}) {
  if (!tokens) return null;
  return (
    <span className="tokens">
      {tokens.map((tok, i) => (
        <span
          key={i}
          className={tok.del ? "token-del" : tok.ins ? "token-ins" : undefined}
        >
          {tok.t === "" ? " " : tok.t}
        </span>
      ))}
    </span>
  );
}
