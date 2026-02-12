import { useState } from "react";

const Header = () => (
	<header style={{ padding: "2rem", borderBottom: "1px solid #e5e7eb" }}>
		<h1 style={{ margin: 0, fontSize: "1.5rem" }}>react-peek demo</h1>
		<p style={{ margin: "0.5rem 0 0", color: "#6b7280" }}>
			Hold <kbd>Cmd</kbd> and hover over components to inspect them.
			<br />
			<kbd>Cmd+Shift+Click</kbd> to open source in your editor.
		</p>
	</header>
);

const Counter = () => {
	const [count, setCount] = useState(0);
	return (
		<div
			style={{
				padding: "1rem",
				border: "1px solid #d1d5db",
				borderRadius: "8px",
			}}
		>
			<h3 style={{ margin: "0 0 0.5rem" }}>Counter</h3>
			<p>Count: {count}</p>
			<button onClick={() => setCount((c) => c + 1)} type="button">
				Increment
			</button>
		</div>
	);
};

const Card = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<div
		style={{
			padding: "1rem",
			border: "1px solid #d1d5db",
			borderRadius: "8px",
		}}
	>
		<h3 style={{ margin: "0 0 0.5rem" }}>{title}</h3>
		{children}
	</div>
);

const UserProfile = () => (
	<Card title="User Profile">
		<p>Name: Jane Doe</p>
		<p>Email: jane@example.com</p>
	</Card>
);

export const App = () => (
	<div style={{ maxWidth: "640px", margin: "0 auto", fontFamily: "system-ui" }}>
		<Header />
		<main
			style={{
				padding: "2rem",
				display: "flex",
				flexDirection: "column",
				gap: "1rem",
			}}
		>
			<Counter />
			<UserProfile />
			<Card title="Nested Components">
				<Counter />
			</Card>
		</main>
	</div>
);
