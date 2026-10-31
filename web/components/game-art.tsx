export function GameArt({ theme }: { theme: 'hunter' | 'knight' | 'adventure' }) {
	return (
		<svg viewBox="0 0 400 260" fill="none" className={`game-art art-${theme}`} aria-hidden="true">
			<defs>
				<radialGradient id={`glow-${theme}`}>
					<stop stopColor="currentColor" stopOpacity=".45" />
					<stop offset="1" stopColor="currentColor" stopOpacity="0" />
				</radialGradient>
			</defs>
			<ellipse cx="200" cy="130" rx="195" ry="150" fill={`url(#glow-${theme})`} />
			<g stroke="currentColor" opacity=".22">
				<circle cx="200" cy="130" r="88" />
				<circle cx="200" cy="130" r="105" strokeDasharray="2 10" />
				<path d="M55 130h290M200 10v240M115 45l170 170M115 215 285 45" />
			</g>
			{theme === 'hunter' ? (
				<g stroke="currentColor" strokeLinejoin="round">
					<path d="m200 32 16 57-16 87-16-87 16-57Z" fill="currentColor" fillOpacity=".25" strokeWidth="2" />
					<path d="m184 89 16 26 16-26M200 35v141" />
					<path d="m165 171 35 8 35-8-10 15h-50l-10-15Z" fill="currentColor" />
					<path d="M200 187v40m-8-5h16" strokeWidth="6" />
					<path d="m153 49-25 52 23-12-8 42m104-82 25 52-23-12 8 42" opacity=".6" strokeWidth="2" />
				</g>
			) : theme === 'knight' ? (
				<g stroke="currentColor" strokeLinejoin="round">
					<path d="m200 40 63 29v65c0 38-63 75-63 75s-63-37-63-75V69l63-29Z" fill="currentColor" fillOpacity=".15" strokeWidth="2" />
					<path d="m200 55 48 23v54c0 27-48 59-48 59s-48-32-48-59V78l48-23Z" opacity=".5" />
					<path d="m200 75 14 35 37 3-28 24 8 35-31-18-31 18 8-35-28-24 37-3 14-35Z" fill="currentColor" fillOpacity=".5" />
					<path d="m100 190 39-26m122 0 39 26M92 200l14-18m188 0 14 18" strokeWidth="4" />
				</g>
			) : (
				<g stroke="currentColor">
					<path d="m200 40 77 45v89l-77 45-77-45V85l77-45Z" fill="currentColor" fillOpacity=".12" strokeWidth="2" />
					<path d="m200 54 64 38v74l-64 38-64-38V92l64-38Z" opacity=".4" />
					<path d="m200 76 17 35 39 5-28 28 7 39-35-19-35 19 7-39-28-28 39-5 17-35Z" fill="currentColor" fillOpacity=".4" strokeWidth="2" />
					<path d="M200 91v58m-26-20 26 20 26-20" strokeWidth="2" />
					<circle cx="200" cy="130" r="85" strokeDasharray="1 12" />
				</g>
			)}
			<g fill="currentColor">
				<path d="m78 59 3 9 9 3-9 3-3 9-3-9-9-3 9-3Zm238 106 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" />
				<circle cx="307" cy="49" r="2" />
				<circle cx="92" cy="199" r="2" />
			</g>
		</svg>
	);
}
