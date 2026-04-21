interface CountryFlagProps {
  countryCode: string;
  className?: string;
}

export const CountryFlag = ({ countryCode, className }: CountryFlagProps) => {
  const flag = countryCode
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");

  return (
    <span className={className} role="img" aria-label={`Flag of ${countryCode}`}>
      {flag}
    </span>
  );
};
