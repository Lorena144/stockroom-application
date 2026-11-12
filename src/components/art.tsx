export function ProductArt({
  kind,
  color = 'sage',
  large = false,
}: {
  kind: string;
  color?: string;
  large?: boolean;
}) {
  const body =
    color === 'clay'
      ? '#bb8b77'
      : color === 'sand'
        ? '#c7bcaa'
        : color === 'slate'
          ? '#566269'
          : '#8d9d8d';
  const dark = '#35443e';
  return (
    <svg
      viewBox="0 0 320 220"
      className={large ? 'product-art large' : 'product-art'}
      aria-hidden="true"
    >
      <ellipse cx="160" cy="184" rx="98" ry="12" fill="#23372b" opacity=".09" />
      {kind === 'keyboard' && (
        <g transform="translate(44 83) rotate(-9 118 50)">
          <rect width="232" height="91" rx="12" fill={dark} />
          <rect x="0" y="-6" width="232" height="87" rx="10" fill={body} />
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 13 }, (_, c) => (
              <rect
                key={`${r}-${c}`}
                x={10 + c * 16.5}
                y={4 + r * 16.5}
                width={c === 6 && r === 3 ? 14 : 12.5}
                height="12"
                rx="2"
                fill={r === 0 && c === 12 ? '#ddc88d' : '#eeeae0'}
                opacity=".95"
              />
            )),
          )}
          <rect x="66" y="54" width="95" height="12" rx="2" fill="#eeeae0" />
        </g>
      )}
      {kind === 'mouse' && (
        <g transform="rotate(-20 160 120)">
          <path
            d="M112 119 C112 57 208 57 208 119 L208 141 C208 199 112 199 112 141Z"
            fill={dark}
          />
          <path
            d="M112 113 C112 51 208 51 208 113 L208 136 C208 185 112 185 112 136Z"
            fill={body}
          />
          <path d="M160 68V113 M114 114H206" stroke="#53644e" strokeWidth="1.5" opacity=".5" />
          <rect x="156" y="80" width="8" height="20" rx="4" fill="#eeeae0" />
        </g>
      )}
      {(kind === 'monitor' || kind === 'laptop') && (
        <g>
          <path d="M144 145H177V178H144Z" fill={body} />
          <rect x="119" y="175" width="83" height="8" rx="4" fill={dark} />
          <rect x="58" y="37" width="205" height="126" rx="9" fill={body} />
          <rect x="65" y="44" width="191" height="109" rx="4" fill="#263f37" />
          <path d="M65 139L134 76L170 112L214 60L256 107V153H65Z" fill="#6d8a78" />
          <path d="M65 153L143 119L199 151L256 95V153Z" fill="#b4c1a3" />
          <circle cx="214" cy="70" r="14" fill="#dfcd99" />
          {kind === 'laptop' && (
            <path d="M57 161H264L287 181Q285 187 272 187H48Q35 187 34 181Z" fill={body} />
          )}
        </g>
      )}
      {kind === 'headphones' && (
        <g>
          <path
            d="M96 127V102C96 30 224 30 224 102V127"
            fill="none"
            stroke={dark}
            strokeWidth="19"
          />
          <path
            d="M96 112V100C96 36 224 36 224 100V112"
            fill="none"
            stroke={body}
            strokeWidth="13"
          />
          <rect x="81" y="103" width="39" height="73" rx="17" fill={body} />
          <rect x="200" y="103" width="39" height="73" rx="17" fill={body} />
          <rect x="110" y="114" width="13" height="53" rx="6" fill={dark} />
          <rect x="197" y="114" width="13" height="53" rx="6" fill={dark} />
        </g>
      )}
      {kind === 'lamp' && (
        <g>
          <ellipse cx="159" cy="180" rx="54" ry="8" fill={dark} />
          <ellipse cx="159" cy="175" rx="54" ry="8" fill={body} />
          <path
            d="M159 170L180 96L143 61"
            fill="none"
            stroke={body}
            strokeWidth="10"
            strokeLinejoin="round"
          />
          <path d="M107 46Q143 32 160 60L175 86L100 110L96 79Q94 55 107 46Z" fill={body} />
          <ellipse cx="137" cy="98" rx="40" ry="8" fill="#efe4b8" transform="rotate(-18 137 98)" />
        </g>
      )}
      {kind === 'mat' && (
        <g transform="translate(47 77) rotate(-8 112 50)">
          <rect x="2" y="4" width="224" height="100" rx="12" fill={dark} opacity=".5" />
          <rect width="224" height="100" rx="12" fill={body} />
          <rect
            x="6"
            y="6"
            width="212"
            height="88"
            rx="9"
            fill="none"
            stroke="#ffffff"
            opacity=".35"
            strokeDasharray="2 3"
          />
        </g>
      )}
      {kind === 'hub' && (
        <g transform="translate(74 91) rotate(-12 85 40)">
          <path d="M169 36Q208 35 214 2" fill="none" stroke={dark} strokeWidth="7" />
          <rect width="175" height="80" rx="13" fill={dark} />
          <rect y="-5" width="175" height="75" rx="13" fill={body} />
          {[24, 63, 102].map((x) => (
            <rect key={x} x={x} y="51" width="25" height="10" rx="2" fill={dark} />
          ))}
          <circle cx="150" cy="55" r="4" fill="#cbe7c7" />
        </g>
      )}
      {kind === 'camera' && (
        <g>
          <path d="M149 134H173V174H149Z" fill={dark} />
          <rect x="117" y="169" width="88" height="12" rx="6" fill={body} />
          <rect x="86" y="76" width="150" height="72" rx="22" fill={body} />
          <circle cx="162" cy="112" r="25" fill={dark} />
          <circle cx="162" cy="112" r="15" fill="#17272d" />
          <circle cx="157" cy="107" r="5" fill="#87b3b6" />
          <circle cx="217" cy="110" r="3" fill="#dcdfbf" />
        </g>
      )}
      {kind === 'speaker' && (
        <g>
          <rect x="106" y="44" width="110" height="140" rx="18" fill={body} />
          <circle cx="161" cy="133" r="35" fill={dark} />
          <circle cx="161" cy="133" r="23" fill={body} opacity=".55" />
          <circle cx="161" cy="75" r="14" fill={dark} />
          <circle cx="161" cy="75" r="5" fill="#d8d5c4" />
        </g>
      )}
      {kind === 'stand' && (
        <g>
          <path d="M93 170L123 95L219 73L189 155Z" fill={body} />
          <path d="M92 170L191 154L218 177L117 191Z" fill={dark} />
          <path d="M86 92L207 63L232 74L111 104Z" fill={body} />
          <path d="M109 108L220 82" stroke="#eee8d7" strokeWidth="3" opacity=".7" />
        </g>
      )}
      {kind === 'cable' && (
        <g>
          <path
            d="M94 88C18 203 287 209 228 85C206 48 115 97 130 147"
            fill="none"
            stroke={dark}
            strokeWidth="12"
          />
          <path
            d="M94 88C18 203 287 209 228 85C206 48 115 97 130 147"
            fill="none"
            stroke={body}
            strokeWidth="8"
          />
          <rect x="83" y="54" width="21" height="43" rx="6" fill={body} />
          <rect x="87" y="45" width="13" height="14" rx="3" fill={dark} />
          <rect x="121" y="143" width="20" height="38" rx="5" fill={body} />
        </g>
      )}
      {kind === 'microphone' && (
        <g>
          <path
            d="M123 107V122Q123 164 198 137Q208 132 208 107"
            fill="none"
            stroke={body}
            strokeWidth="8"
          />
          <path d="M166 151V179" stroke={dark} strokeWidth="9" />
          <ellipse cx="166" cy="182" rx="40" ry="7" fill={body} />
          <rect x="137" y="36" width="58" height="108" rx="28" fill={body} />
          {[53, 64, 75, 86].map((y) => (
            <path key={y} d={`M150 ${y}H182`} stroke={dark} strokeWidth="3" opacity=".6" />
          ))}
          <circle cx="166" cy="117" r="5" fill={dark} />
        </g>
      )}
    </svg>
  );
}
export function Brand() {
  return (
    <a className="brand" href="/catalog" aria-label="Stockroom home">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="M4 9L16 3L28 9V23L16 29L4 23Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        />
        <path
          d="M4 9L16 15L28 9M16 15V29M10 6L22 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        />
      </svg>
      stockroom<span>®</span>
    </a>
  );
}
