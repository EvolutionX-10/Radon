'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Copy, Search, Terminal } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { commands } from '@/lib/site';

type Command = (typeof commands)[number];
export function CommandBrowser() {
	const [category, setCategory] = useState('All');
	const [query, setQuery] = useState('');
	const [selected, setSelected] = useState<Command | null>(null);
	const [copyStatus, setCopyStatus] = useState('');
	const filtered = commands.filter(
		(command) =>
			(category === 'All' || command.category === category) &&
			`${command.name} ${command.description}`.toLowerCase().includes(query.toLowerCase())
	);
	async function copyCommand() {
		try {
			await navigator.clipboard.writeText(selected!.example);
			setCopyStatus('Copied to clipboard');
		} catch {
			setCopyStatus('Select the command above to copy it manually.');
		}
	}
	return (
		<div className="command-browser">
			<div className="command-toolbar">
				<div className="command-tabs" role="group" aria-label="Filter commands">
					{['All', 'Games', 'Moderation', 'Getting started'].map((value) => (
						<Button key={value} variant="ghost" aria-pressed={category === value} onClick={() => setCategory(value)}>
							{value}
						</Button>
					))}
				</div>
				<div className="command-search">
					<Search size={16} />
					<Input
						aria-label="Search commands"
						placeholder="Find your next command…"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>
			</div>
			<div className="command-results" aria-live="polite">
				<p className="sr-only">{filtered.length} commands found</p>
				{filtered.length ? (
					filtered.map((command) => (
						<button
							key={command.name}
							className="command-row"
							onClick={() => {
								setSelected(command);
								setCopyStatus('');
							}}
						>
							<code>{command.name}</code>
							<span>{command.description}</span>
							<ArrowUpRight size={17} />
						</button>
					))
				) : (
					<div className="empty-state">
						<Search />
						<h3>No commands found</h3>
						<p>Try another search or category.</p>
						<Button
							variant="outline"
							onClick={() => {
								setQuery('');
								setCategory('All');
							}}
						>
							Clear filters
						</Button>
					</div>
				)}
			</div>
			<div className="command-note">
				<Terminal size={15} />
				<span>
					A few favorites to get you started. Run <code>/help</code> in Discord for your full, permission-aware command list.
				</span>
			</div>
			<Dialog
				open={selected !== null}
				onOpenChange={(open) => {
					if (!open) setSelected(null);
				}}
			>
				<DialogContent className="command-dialog">
					<DialogHeader>
						<DialogTitle>{selected?.name}</DialogTitle>
						<DialogDescription>{selected?.description}</DialogDescription>
					</DialogHeader>
					<div className="command-example">
						<span>TRY IT IN DISCORD</span>
						<code>{selected?.example}</code>
					</div>
					<p className="dialog-hint">
						Replace sample values in Discord. Add the optional <code>game</code> field to claim commands for another supported game.
						Commands depend on server setup and your permissions.
					</p>
					<Button onClick={copyCommand} className="button-primary">
						{copyStatus === 'Copied to clipboard' ? <Check /> : <Copy />}Copy example
					</Button>
					<p role="status" className="copy-status">
						{copyStatus}
					</p>
				</DialogContent>
			</Dialog>
		</div>
	);
}
