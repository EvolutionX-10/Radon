import { ImageResponse } from 'next/og';
export const alt = 'Radon — V3. Four years in. A whole new chapter. Game rewards, moderation, and a better Discord community.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function OpenGraphImage() {
	return new ImageResponse(
		<div
			style={{
				display: 'flex',
				width: '100%',
				height: '100%',
				background: '#17131e',
				color: '#f3f2ee',
				padding: '65px 80px',
				flexDirection: 'column',
				fontFamily: 'sans-serif'
			}}
		>
			<div style={{ display: 'flex', color: '#bca9ff', fontSize: 38, fontWeight: 700 }}>radon. V3</div>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					marginTop: 40,
					fontSize: 82,
					fontWeight: 700,
					letterSpacing: -4,
					lineHeight: 1.05
				}}
			>
				<span>Four years in.</span>
				<span style={{ color: '#bca9ff' }}>A whole new chapter.</span>
			</div>
			<div style={{ display: 'flex', marginTop: 36, fontSize: 23, color: '#b6a8c7' }}>Game rewards. A safer community. Less busywork.</div>
			<div style={{ display: 'flex', marginTop: 'auto', fontSize: 16, color: '#d3f58b', letterSpacing: 2 }}>
				VERSION 3.0.0 · THE NEXT CHAPTER
			</div>
		</div>,
		size
	);
}
