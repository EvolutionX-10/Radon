import { blacklistDB } from '#models';

export class Blacklist {
	public async add(id: string, reason: string) {
		const doc = await blacklistDB.findByIdAndUpdate(
			id,
			{
				reason
			},
			{
				upsert: true
			}
		);
		if (!doc) return null;
		return doc as document;
	}
	public async isBlacklisted(id: string) {
		return blacklistDB.findById(id).then((doc) => !!doc);
	}
	public async remove(id: string) {
		const doc = await blacklistDB.findByIdAndDelete(id);
		const reason = doc?.reason;
		return reason;
	}
}
interface document {
	id: string;
	reason: string;
}
